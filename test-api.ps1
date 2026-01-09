# Test the Issue Classifier API
# Usage: .\test-api.ps1

$uri = "http://localhost:3000/api/issues/classify"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Issue Classifier API Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    @{
        name = "Production Database Issue"
        text = "Database connection pool exhausted. Production is down. Users cannot access the system."
        expected = "high"
    },
    @{
        name = "UI Bug"
        text = "Button alignment is off by 2px on mobile screens"
        expected = "medium/low"
    },
    @{
        name = "Performance Issue"
        text = "API response time increased from 50ms to 2 seconds after latest deployment"
        expected = "high"
    },
    @{
        name = "Memory Leak"
        text = "Memory leak in WebSocket handler causes crashes after 6 hours of uptime"
        expected = "high"
    },
    @{
        name = "Documentation Request"
        text = "Add examples to README for new users getting started with the project"
        expected = "low"
    }
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "Test: $($test.name)" -ForegroundColor Yellow
    Write-Host "Input: $($test.text)" -ForegroundColor Gray
    
    $body = @{ text = $test.text } | ConvertTo-Json -Compress
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            $result = $response.Content | ConvertFrom-Json
            Write-Host "  ✓ Status: 200 OK" -ForegroundColor Green
            Write-Host "  Priority: $($result.priority) (confidence: $([math]::Round($result.priority_confidence * 100, 1))%)" -ForegroundColor White
            Write-Host "  Tags: $($result.tags -join ', ')" -ForegroundColor White
            
            if ($result.all_tag_scores) {
                $topTags = $result.all_tag_scores.PSObject.Properties | Sort-Object Value -Descending | Select-Object -First 3
                Write-Host "  Top Tag Scores:" -ForegroundColor Gray
                foreach ($tag in $topTags) {
                    Write-Host "    - $($tag.Name): $([math]::Round($tag.Value * 100, 1))%" -ForegroundColor Gray
                }
            }
            
            $passed++
        } else {
            Write-Host "  ✗ Unexpected status: $($response.StatusCode)" -ForegroundColor Red
            $failed++
        }
    }
    catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
