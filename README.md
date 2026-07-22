# ゴロ寝動画台本

スマートフォンでナレーション兼字幕を一つずつ入力し、DaVinci Resolve / Adobe Premiere Proで使える標準SRTを書き出す、バックエンド不要のWebアプリです。

文章はブラウザのlocalStorageへ自動保存され、外部へ自動送信されません。GPTによる文章修正は、有料APIを使わず、専用JSONファイルの書き出し・読み込みで行います。

## 起動

Node.js 22以降とpnpmを使用します。

```bash
corepack enable
pnpm install
pnpm dev
```

表示されたローカルURLをブラウザで開いてください。

アプリ名・短い名称・説明・共有用コピーは `app.config.json` の一か所で変更できます。画面、HTMLメタデータ、PWA manifestへビルド時に反映されます。

## テストとビルド

```bash
pnpm test
pnpm build
```

公開用ファイルは `dist` に生成されます。相対パスでビルドするため、GitHub Pagesのリポジトリ配下URLでも追加設定なく動作します。

GitHub Pages相当のサブパスをローカルで確認する場合は、ビルド後に次を実行します。

```bash
pnpm preview:subpath
```

`http://localhost:8080/narration-srt/` で確認できます。

## GitHub Pagesで公開

1. このフォルダをGitHubリポジトリのルートとしてpushします。
2. GitHubの **Settings → Pages** を開きます。
3. **Source** で **GitHub Actions** を選びます。
4. `main` ブランチへpushすると、同梱の `.github/workflows/deploy-pages.yml` がテスト・ビルド・公開を実行します。

公開後、一度オンラインで読み込むと、対応ブラウザではホーム画面追加とオフライン編集・ファイル生成が利用できます。

## データについて

- 台本は使用中のブラウザ・端末内だけに保存されます。
- ブラウザのサイトデータを消すと台本も消えます。
- プライベートブラウズでは保存が保持されない場合があります。
- 端末をまたぐ同期や専用サーバーへの転送は行いません。SRT / JSONはOS標準共有またはダウンロードで移動します。
