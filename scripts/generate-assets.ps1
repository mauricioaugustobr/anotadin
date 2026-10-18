# ---------------------------------------------------------------------------
# Gera os assets visuais do ANOTADIN (ícones PWA e imagem de compartilhamento)
# Uso: powershell -ExecutionPolicy Bypass -File scripts/generate-assets.ps1
# ---------------------------------------------------------------------------

Add-Type -AssemblyName System.Drawing

$publicDir = Join-Path $PSScriptRoot '..\public'

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
    $path.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
    $path.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
    $path.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Canvas([int]$w, [int]$h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return @($bmp, $g)
}

function Draw-Mark([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$size) {
    $path = New-RoundedRectPath $x $y $size $size ($size * 0.22)
    $rect = New-Object System.Drawing.RectangleF($x, $y, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 47, 111, 235),
        [System.Drawing.Color]::FromArgb(255, 110, 160, 255),
        45)
    $g.FillPath($brush, $path)
    $fontSize = $size * 0.58
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString('A', $font, [System.Drawing.Brushes]::White, $rect, $format)
    $brush.Dispose()
    $font.Dispose()
    $format.Dispose()
    $path.Dispose()
}

# ---------------------------------------------------------------------------
# Ícones PWA (192, 512 e 180 para iOS) — marca com margem segura (maskable)
# ---------------------------------------------------------------------------
foreach ($spec in @(@{ s = 192; file = 'icon-192.png' }, @{ s = 512; file = 'icon-512.png' }, @{ s = 180; file = 'apple-touch-icon.png' })) {
    $size = $spec.s
    $arr = New-Canvas $size $size
    $bmp = $arr[0]; $g = $arr[1]
    $margin = $size * 0.10
    Draw-Mark $g $margin $margin ($size - 2 * $margin)
    $out = Join-Path $publicDir $spec.file
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Host "Gerado: $out"
}

# ---------------------------------------------------------------------------
# Imagem de compartilhamento (Open Graph, 1200x630)
# ---------------------------------------------------------------------------
$arr = New-Canvas 1200 630
$bmp = $arr[0]; $g = $arr[1]

# Fundo em gradiente azul-escuro
$bgRect = New-Object System.Drawing.RectangleF(0, 0, 1200, 630)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bgRect,
    [System.Drawing.Color]::FromArgb(255, 18, 28, 66),
    [System.Drawing.Color]::FromArgb(255, 42, 96, 200),
    60)
$g.FillRectangle($bgBrush, $bgRect)

# Marca
Draw-Mark $g 80 232 166

# Título
$titleFont = New-Object System.Drawing.Font('Segoe UI', 92, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('ANOTADIN', $titleFont, [System.Drawing.Brushes]::White, 292, 236)

# Subtítulo
$subFont = New-Object System.Drawing.Font('Segoe UI', 32, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 226, 235, 255))
$g.DrawString('Notas open source com editor de blocos', $subFont, $subBrush, 296, 356)

# Rodapé com URL
$urlFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$urlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 226, 235, 255))
$g.DrawString('github.com/mauricioaugustobr/anotadin', $urlFont, $urlBrush, 296, 470)

$out = Join-Path $publicDir 'og.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Gerado: $out"

$titleFont.Dispose(); $subFont.Dispose(); $urlFont.Dispose()
$subBrush.Dispose(); $urlBrush.Dispose(); $bgBrush.Dispose()
$g.Dispose(); $bmp.Dispose()
Write-Host 'Concluído.'
