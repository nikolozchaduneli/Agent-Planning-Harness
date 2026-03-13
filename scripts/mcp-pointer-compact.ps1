param(
  [string]$StatePath = $env:MCP_POINTER_STATE_PATH
)

if (-not $StatePath -or $StatePath.Trim().Length -eq 0) {
  $StatePath = (Join-Path $PSScriptRoot "..\.mcp-pointer\shared-state.json")
}

if (!(Test-Path $StatePath)) {
  Write-Output "not-found"
  exit 1
}

$json = Get-Content $StatePath -Raw | ConvertFrom-Json
$processed = $json.data.processedPointedDOMElement
$raw = $json.data.rawPointedDOMElement

$useProcessed = $false
if ($processed) {
  $hasNullClass = $false
  if ($processed.classes) {
    $hasNullClass = ($processed.classes | Where-Object { $_ -eq $null }).Count -gt 0
  }
  $selectorLooksPlaceholder = $false
  if ($processed.selector) {
    $selectorLooksPlaceholder = $processed.selector -match '\.\.\.\.'
  }
  $useProcessed = -not $hasNullClass -and -not $selectorLooksPlaceholder
}

if ($useProcessed) {
  $styles = $null
  if ($processed.cssComputed) {
    $styles = [ordered]@{
      display        = $processed.cssComputed.display
      position       = $processed.cssComputed.position
      zIndex         = $processed.cssComputed."z-index"
      flexDirection  = $processed.cssComputed."flex-direction"
      flexWrap       = $processed.cssComputed."flex-wrap"
      alignItems     = $processed.cssComputed."align-items"
      justifyContent = $processed.cssComputed."justify-content"
      gap            = $processed.cssComputed.gap
      padding        = $processed.cssComputed.padding
      margin         = $processed.cssComputed.margin
      width          = $processed.cssComputed.width
      height         = $processed.cssComputed.height
    }
  } elseif ($raw -and $raw.computedStyles) {
    $styles = [ordered]@{
      display        = $raw.computedStyles.display
      position       = $raw.computedStyles.position
      zIndex         = $raw.computedStyles."z-index"
      flexDirection  = $raw.computedStyles."flex-direction"
      flexWrap       = $raw.computedStyles."flex-wrap"
      alignItems     = $raw.computedStyles."align-items"
      justifyContent = $raw.computedStyles."justify-content"
      gap            = $raw.computedStyles.gap
      padding        = $raw.computedStyles.padding
      margin         = $raw.computedStyles.margin
      width          = $raw.computedStyles.width
      height         = $raw.computedStyles.height
    }
  }
  $compact = [ordered]@{
    selector   = $processed.selector
    tagName    = $processed.tagName
    id         = $processed.id
    classes    = $processed.classes
    attributes = $processed.attributes
    innerText  = $processed.innerText
    textContent= $processed.textContent
    url        = $processed.url
    position   = $processed.position
    styles     = $styles
    timestamp  = $processed.timestamp
    warnings   = $processed.warnings
  }
} elseif ($raw) {
  $outer = $raw.outerHTML
  $tagName = $null
  if ($outer -match '^<\s*([a-zA-Z0-9:-]+)') {
    $tagName = $Matches[1].ToUpper()
  }

  $id = $null
  if ($outer -match 'id\s*=\s*"([^"]*)"') {
    $id = $Matches[1]
  }

  $classes = @()
  if ($outer -match 'class\s*=\s*"([^"]*)"') {
    $classes = $Matches[1].Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
  }

  $attributes = [ordered]@{}
  if ($outer -match '<\s*[^\s>]+\s*([^>]*)>') {
    $attrText = $Matches[1]
    $matches = [regex]::Matches($attrText, '([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|''([^'']*)''|([^\s"''=<>`]+)))?')
    foreach ($m in $matches) {
      $name = $m.Groups[1].Value
      if (-not $name -or $name -eq "/") { continue }
      $value = $m.Groups[2].Value
      if ($value -eq "") { $value = $m.Groups[3].Value }
      if ($value -eq "") { $value = $m.Groups[4].Value }
      if ($value -eq "") { $value = $true }
      $attributes[$name] = $value
    }
  }

  $text = ($outer -replace '<[^>]+>', ' ') -replace '\s+', ' '
  $text = $text.Trim()

  $selector = $tagName
  if ($id) {
    $selector = "#$id"
  } elseif ($classes.Count -gt 0 -and $tagName) {
    $selector = ($tagName.ToLower() + "." + ($classes -join "."))
  }

  $position = $null
  if ($raw.boundingClientRect) {
    $position = [ordered]@{
      x = $raw.boundingClientRect.x
      y = $raw.boundingClientRect.y
      width = $raw.boundingClientRect.width
      height = $raw.boundingClientRect.height
    }
  }

  $timestamp = $null
  if ($raw.timestamp) {
    $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$raw.timestamp).ToString("o")
  }

  $styles = $null
  if ($raw.computedStyles) {
    $styles = [ordered]@{
      display        = $raw.computedStyles.display
      position       = $raw.computedStyles.position
      zIndex         = $raw.computedStyles."z-index"
      flexDirection  = $raw.computedStyles."flex-direction"
      flexWrap       = $raw.computedStyles."flex-wrap"
      alignItems     = $raw.computedStyles."align-items"
      justifyContent = $raw.computedStyles."justify-content"
      gap            = $raw.computedStyles.gap
      padding        = $raw.computedStyles.padding
      margin         = $raw.computedStyles.margin
      width          = $raw.computedStyles.width
      height         = $raw.computedStyles.height
    }
  }

  $compact = [ordered]@{
    selector   = $selector
    tagName    = $tagName
    id         = $id
    classes    = $classes
    attributes = $attributes
    innerText  = $text
    textContent= $text
    url        = $raw.url
    position   = $position
    styles     = $styles
    timestamp  = $timestamp
    warnings   = $null
  }
} else {
  Write-Output "no-element"
  exit 1
}

$compact | ConvertTo-Json -Depth 6
