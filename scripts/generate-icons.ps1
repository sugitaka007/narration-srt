Add-Type -AssemblyName System.Drawing

function Add-RoundedRectangle {
  param(
    [System.Drawing.Drawing2D.GraphicsPath]$Path,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )
  $diameter = $Radius * 2
  $Path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $Path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $Path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $Path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $Path.CloseFigure()
}

function New-SubtitleIcon {
  param([int]$Size, [string]$OutputPath)
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(66, 95, 208))

  $panelPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRectangle $panelPath ($Size * 0.13) ($Size * 0.18) ($Size * 0.74) ($Size * 0.64) ($Size * 0.09)
  $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 253, 249))
  $graphics.FillPath($panelBrush, $panelPath)

  $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(66, 95, 208))
  $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(151, 162, 205))
  $graphics.FillRectangle($accentBrush, $Size * 0.25, $Size * 0.34, $Size * 0.5, $Size * 0.075)
  $graphics.FillRectangle($mutedBrush, $Size * 0.25, $Size * 0.48, $Size * 0.38, $Size * 0.065)
  $graphics.FillRectangle($mutedBrush, $Size * 0.25, $Size * 0.61, $Size * 0.48, $Size * 0.065)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $accentBrush.Dispose()
  $mutedBrush.Dispose()
  $panelBrush.Dispose()
  $panelPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$publicDirectory = Join-Path $PSScriptRoot "..\public"
New-SubtitleIcon 192 (Join-Path $publicDirectory "icon-192.png")
New-SubtitleIcon 512 (Join-Path $publicDirectory "icon-512.png")
