# Deploy to GitHub Script

Write-Host "Initializing Git repository..." -ForegroundColor Yellow
git init

Write-Host "Adding remote repository..." -ForegroundColor Yellow
git remote add origin https://github.com/MasterMIS/Sohan_ERP.git

Write-Host "Creating .gitignore file..." -ForegroundColor Yellow
# .gitignore will be created separately

Write-Host "Adding all files..." -ForegroundColor Yellow
git add .

Write-Host "Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: ERP System with HelpDesk, Delegation, Checklist, Todo, Chat, Users"

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Your repository is now available at: https://github.com/MasterMIS/Sohan_ERP" -ForegroundColor Cyan
