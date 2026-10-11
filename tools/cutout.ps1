# Usage (PowerShell, from the project folder):
#   .	oolstout.ps1 -In ko.jpg -Out docsssetsxko.png -Mode global -MaxSize 480
# Use -Mode flood for art with white inside an outline (speech bubbles).
param(
  [string]$In, [string]$Out,
  [ValidateSet('flood', 'global')][string]$Mode = 'flood',
  [int]$MaxSize = 800
)
# Removes a painted checkerboard ("fake transparency") and saves a real transparent PNG.
# flood: only light-grey/white pixels connected to the image edge (keeps white inside outlines).
# global: every light neutral pixel (for art without white parts).
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class Cutout {
  static bool IsBg(byte b, byte g, byte r) {
    int mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
    return mn > 165 && (mx - mn) < 30;
  }
  public static string Run(string input, string output, bool flood, int maxSize) {
    using (var src = new Bitmap(input)) {
      int w = src.Width, h = src.Height;
      var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
      using (var gr = Graphics.FromImage(bmp)) gr.DrawImage(src, 0, 0, w, h);
      var rect = new Rectangle(0, 0, w, h);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      var px = new byte[stride * h];
      Marshal.Copy(data.Scan0, px, 0, px.Length);
      var bg = new bool[w * h];
      if (flood) {
        var q = new Queue<int>();
        Action<int,int> push = (x, y) => {
          int i = y * w + x; if (bg[i]) return;
          int o = y * stride + x * 4;
          if (!IsBg(px[o], px[o+1], px[o+2])) return;
          bg[i] = true; q.Enqueue(i);
        };
        for (int x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
        for (int y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
        while (q.Count > 0) {
          int i = q.Dequeue(), x = i % w, y = i / w;
          if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y);
          if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
        }
      } else {
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
          int o = y * stride + x * 4; bg[y * w + x] = IsBg(px[o], px[o+1], px[o+2]);
        }
      }
      int minX = w, minY = h, maxX = -1, maxY = -1;
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
        int o = y * stride + x * 4;
        if (bg[y * w + x]) { px[o+3] = 0; continue; }
        // Soften the edge: light pixels next to the background become partly transparent.
        bool edge = (x > 0 && bg[y*w+x-1]) || (x < w-1 && bg[y*w+x+1]) || (y > 0 && bg[(y-1)*w+x]) || (y < h-1 && bg[(y+1)*w+x]);
        if (edge) {
          int mn = Math.Min(px[o], Math.Min(px[o+1], px[o+2]));
          if (mn > 120) px[o+3] = (byte)Math.Max(0, 255 - (mn - 120) * 2);
        }
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      Marshal.Copy(px, 0, data.Scan0, px.Length);
      bmp.UnlockBits(data);
      int pad = 4;
      minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
      maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
      var crop = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
      double scale = Math.Min(1.0, (double)maxSize / Math.Max(crop.Width, crop.Height));
      int ow = (int)Math.Round(crop.Width * scale), oh = (int)Math.Round(crop.Height * scale);
      using (var outBmp = new Bitmap(ow, oh, PixelFormat.Format32bppArgb))
      using (var g = Graphics.FromImage(outBmp)) {
        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        g.DrawImage(bmp, new Rectangle(0, 0, ow, oh), crop, GraphicsUnit.Pixel);
        outBmp.Save(output, ImageFormat.Png);
      }
      bmp.Dispose();
      return ow + "x" + oh;
    }
  }
}
"@
[Cutout]::Run($In, $Out, $Mode -eq 'flood', $MaxSize)
