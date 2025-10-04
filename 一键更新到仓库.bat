@echo off
:: 设置窗口标题
title=GitHub 快速更新脚本 (mobile-master)

echo ==================================================
echo      正在开始将修改更新到 GitHub 仓库...
echo      目标仓库: https://github.com/cnfh1746/mobile-master.git
echo ==================================================
echo.

:: 第一步: 添加所有更改到暂存区
echo [1/3] 正在暂存所有文件...
git add .
echo      完成!
echo.

:: 第二步: 提交更改，并自动生成提交信息
echo [2/3] 正在提交本地更改...
:: 使用更兼容的 commit 信息格式
set "commit_msg=脚本自动更新于 %date% %time:~0,8%"
git commit -m "%commit_msg%"
echo      完成!
echo.

:: 第三步: 推送到 GitHub 的 main 分支
echo [3/3] 正在推送到 GitHub...
git push origin main
echo.

echo ==================================================
echo      所有操作已完成！仓库已更新。
echo ==================================================
echo.

:: 暂停窗口，以便用户能看到结果
pause