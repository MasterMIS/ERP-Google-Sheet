@echo off
echo ========================================
echo   Deploy ERP System to GitHub
echo ========================================
echo.

echo Step 1: Initializing Git repository...
git init

echo.
echo Step 2: Adding remote repository...
git remote add origin https://github.com/MasterMIS/Sohan_ERP.git

echo.
echo Step 3: Adding all files...
git add .

echo.
echo Step 4: Creating initial commit...
git commit -m "Initial commit: ERP System with HelpDesk, Delegation, Checklist, Todo, Chat, Users"

echo.
echo Step 5: Renaming branch to main...
git branch -M main

echo.
echo Step 6: Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your repository is now available at:
echo https://github.com/MasterMIS/Sohan_ERP
echo.
pause
