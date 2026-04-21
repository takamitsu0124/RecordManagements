# 動作テスト用ユーザー（自動作成） - 2026-04-17

以下は自動スクリプトで作成したテストユーザーと紐づけ情報です。パスワードはすべて同一です（kagura1130）。

## ギルド
- guild-alpha
- guild-beta

## ユーザー一覧
- testuser1@example.com
  - UID: 3eBIje9YbjhwzYWCWv7Js75St4g1
  - Role: guild_admin
  - Guild: guild-alpha
  - Password: kagura1130

- testuser2@example.com
  - UID: T4Bz9UB3GZQoX8ltXBICgVged9C2
  - Role: guild_admin
  - Guild: guild-alpha
  - Password: kagura1130

- testuser3@example.com
  - UID: hjQewLeTMSNe1FmdfL6aLDxcVeY2
  - Role: guild_admin
  - Guild: guild-beta
  - Password: kagura1130

- testuser4@example.com
  - UID: K4MabeUN6Lee7A2MIXH9uyTxKAw2
  - Role: member
  - Guild: guild-alpha
  - Password: kagura1130

- testuser5@example.com
  - UID: imANESjGunV3HTuIYllGiYJvE712
  - Role: member
  - Guild: guild-beta
  - Password: kagura1130

- testuser6@example.com
  - UID: IAcw4NEVxecQxQrnEYfJyg232B03
  - Role: member
  - Guild: guild-beta
  - Password: kagura1130

## CSV エクスポート
- CSV をリポジトリに出力済み: `scripts/users-export.csv`

## 確認手順（簡易）
1. Firebase Authentication にて上記メール/パスワードでサインイン可能か確認。
2. Firestore: `users/{uid}` ドキュメントの `role` と `guildId` を確認。
3. Firestore: `guilds/{guildId}` ドキュメントの `guildMember` マップに UID と名前が存在することを確認。

## 備考
- サービスアカウントファイルを用いてサーバー側で作成・更新を実施しました。
- もしパスワードを変更したい場合は管理コンソールまたは Admin SDK を使用してください。
