# Инструкция по загрузке в GitHub

## Способ 1: Через Git (рекомендуется)

1. Установите Git: https://git-scm.com/download/win

2. Откройте PowerShell в папке `D:\bat\buhtask` и выполните:

```bash
git init
git add .
git commit -m "Initial commit - BuhTask MVP"
git branch -M main
git remote add origin https://github.com/a3244440/Buhtask.git
git push -u origin main
```

## Способ 2: Через GitHub Desktop

1. Скачайте GitHub Desktop: https://desktop.github.com/
2. Откройте приложение
3. File → Add Local Repository
4. Выберите папку `D:\bat\buhtask`
5. Нажмите Publish repository

## Способ 3: Ручная загрузка через веб-интерфейс

1. Зайдите на https://github.com/a3244440/Buhtask/
2. Нажмите "Add file" → "Upload files"
3. Перетащите все файлы из `D:\bat\buhtask`
4. Нажмите "Commit changes"

**Важно:** Не загружайте папку `node_modules/` и файл `.env.local`
