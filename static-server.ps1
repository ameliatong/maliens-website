param(
    [string]$Root = "C:/Users/Lenovo/Downloads/maliens-website-31.08/maliens-website/public",
    [int]$Port = 4173
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"

$mimeMap = @{
    ".html" = "text/html"; ".htm" = "text/html"; ".js" = "application/javascript"; ".mjs" = "application/javascript";
    ".css" = "text/css"; ".json" = "application/json"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg";
    ".gif" = "image/gif"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"; ".mp4" = "video/mp4"; ".glb" = "model/gltf-binary";
    ".woff" = "font/woff"; ".woff2" = "font/woff2"; ".webp" = "image/webp"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
        $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $Root ($path.TrimStart('/'))
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.Headers.Add("Cache-Control", "no-store")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    }
    catch {
        $response.StatusCode = 500
    }
    finally {
        $response.OutputStream.Close()
    }
}
