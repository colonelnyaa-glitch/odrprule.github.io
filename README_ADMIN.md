# ODRP リアルタイム管理画面 設定

## 1. Supabaseを作成
1. Supabaseで新規プロジェクトを作成します。
2. SQL Editorで `supabase-setup.sql` を実行します。
3. Authentication → Users → Add user から管理者を追加します。
   - 管理者IDを `admin` にする場合、メールは `admin@odrp-admin.local`
   - パスワードは任意に設定
   - Email confirmedを有効にする

## 2. config.jsを設定
Supabaseの Project Settings → API から以下をコピーします。
- Project URL
- anon public key

`config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を置き換えます。

## 3. GitHub Pagesへ一度だけ反映
今回のフォルダ全体をGitHubへ反映します。以降、文章やCSSの変更ではHTML再アップロードは不要です。

## 4. 管理画面
`https://あなたのURL/admin.html` を開きます。

管理者ID: `admin`
パスワード: Supabaseで設定したもの

「保存して公開」を押すと、公開ページは次回読み込み時から新しい内容を表示します。

## 注意
- GitHub Pagesだけでは安全なID・パスワード認証と永続保存はできないため、Supabaseを使用します。
- `anon key` は公開されてもよいキーですが、RLSを無効にしないでください。
- 管理者ユーザー以外をSupabase Authenticationへ追加しないでください。
