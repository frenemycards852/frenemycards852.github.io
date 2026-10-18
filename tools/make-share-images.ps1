# Usage (PowerShell, from the project folder, with the site served locally):
#   .\tools\make-share-images.ps1
#   .\tools\make-share-images.ps1 -Base http://127.0.0.1:5500/docs   (Live Server)
# Saves the link preview image (docs/assets/og.jpg, JPEG: WhatsApp skips big previews) and the app icons (docs/assets/icons/)
# by screenshotting docs/dev/og.html with headless Chrome. Icons use
# docs/assets/icons/icon-source.png when it exists (a placeholder otherwise).
param(
  [string]$Base = 'http://localhost:5600',
  [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'docs\assets'
New-Item -ItemType Directory -Force (Join-Path $assets 'icons') | Out-Null

$shots = @(
  @{ Query = 'shot=og'; W = 1200; H = 630; Out = 'og.jpg' },
  @{ Query = 'shot=icon&size=512'; W = 512; H = 512; Out = 'icons\icon-512.png' },
  @{ Query = 'shot=icon&size=192'; W = 192; H = 192; Out = 'icons\icon-192.png' },
  @{ Query = 'shot=icon&size=180'; W = 180; H = 180; Out = 'icons\apple-touch-icon.png' },
  @{ Query = 'shot=icon&size=32'; W = 32; H = 32; Out = 'icons\favicon-32.png' }
)
Add-Type -AssemblyName System.Drawing
foreach ($s in $shots) {
  $out = Join-Path $assets $s.Out
  $png = if ($out.EndsWith('.jpg')) { [IO.Path]::ChangeExtension($out, '.tmp.png') } else { $out }
  $url = "$Base/dev/og.html?$($s.Query)"
  & $Chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
    --virtual-time-budget=15000 "--window-size=$($s.W),$($s.H)" "--screenshot=$png" $url 2>$null | Out-Null
  if (-not (Test-Path $png)) { Write-Output "FAILED $($s.Out)"; continue }
  if ($png -ne $out) {
    $img = [Drawing.Image]::FromFile($png)
    $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 85L
    $img.Save($out, $codec, $params)
    $img.Dispose()
    Remove-Item $png
  }
  Write-Output ("saved {0} ({1} KB)" -f $s.Out, [math]::Round((Get-Item $out).Length / 1KB))
}
