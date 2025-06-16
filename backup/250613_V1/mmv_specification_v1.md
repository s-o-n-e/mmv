# mmv v1 仕様書

作成:2025/06/13 曽根 with ChatGPT4.1

## 1. 全体説明

**mmv v1**は、複数のHLS形式ビデオファイルをウェブブラウザ上で同期・可視化し、  
有効区間・現在時刻・誤差補正・カレンダータイムなどの操作と比較を行うための統合ビューア環境です。  
本システムは、主に以下の4ファイルで構成され、サーバーサイドAPIとフロントエンドUIを連携させることで、  
GNSS/カメラ等の時刻精度評価や複数ビデオストリームの同期解析を効率的に行うことを目的としています。

---

## 2. ファイル構成と機能概要

### 2.1 `mmvserver.py`（バックエンド・サーバ）

- FlaskベースのWebサーバー
- HLSビデオファイル群、及び関連JSONファイルの自動リスト化APIを提供
- `/hls_streams` APIで、`media/hls`以下のHLSプレイリストファイル一覧をJSONで返却
- HTTP経由でHLSファイル・frametime.json等を静的配信
- CORS対応やパス構成のカスタマイズが可能
- 動作環境（Python, ffmpeg等）を一元管理

---

### 2.2 `hls-panel.js`（HLSパネルUI）

- HLSプレイリストを参照し、ビデオストリームを再生
- master/slave（役割切替）による有効区間同期
- ファイル選択UI、先頭時刻（カレンダータイム）・区間長の表示
- 有効区間バー、誤差補正値入力、スライダーバー
- 目盛・ラベル・旗竿（Tstart/Tend）描画
- 旗竿クリックでTstart/Tendへジャンプ
- stepボタン群による細かな時刻変更
- SYSTIMEパネルとの現在時刻・有効区間同期API
- 公開API：`setCurrT`, `setValidRange`, `setOnCurrTChange`, `setOnValidRangeChange`

---

### 2.3 `systime-panel.js`（SYSTIMEパネルUI）

- 複数パネル（ChildPanel）を管理し時刻・有効区間を一元制御
- カレンダータイム・オフセット時刻の表示
- スライダー＋目盛＋ラベル＋ノブ（中心一致補正対応）
- stepボタン、set-0ボタンによる時刻調整
- 有効区間の同期・伝搬（master/slaveを自動判定し配信）
- 現在時刻（currT）や有効区間の双方向通知
- 公開API：`setCurrT`, `setValidRange`, `setChildPanels`, `setOnCurrTChange`, `setOnValidRangeChange`

---

### 2.4 `dualhlstest.html`（統合テストUI）

- SYSTIMEパネル（上部・全幅）＋HLSパネル2枚（下部・半幅）を画面レイアウト
- HLSパネルのファイルリスト自動取得と選択
- master/slave自動割当て、SYSTIMEとの同期登録
- 各種パネルの幅・高さレイアウトをHTML側で設定可能
- 全体のスタイル（CSS）・レスポンシブ対応
- スクリプトでChildPanels/SYSTIMEパネルのコールバック連携

---

## 3. 連携動作フロー

1. サーバ起動（mmvserver.py）→ `/hls_streams`でファイルリスト取得
2. dualhlstest.htmlでSYSTIMEパネル＋HLSパネル群を自動生成
3. 各HLSパネルでビデオ選択、先頭時刻・有効区間決定
4. masterパネルで有効区間/時刻を変更→SYSTIME→他パネルへ一斉同期
5. stepボタンや旗竿ジャンプで細かな同期制御
6. 誤差補正やカレンダータイム補正値入力にも即座に反映

---

## 4. 発展性・カスタマイズ指針

- HLSパネルやChildPanelは任意個に拡張可能
- 各種APIは共通インターフェイスで抽象化（再利用性・保守性向上）
- CSSクラスとサイズはHTML側で自由にカスタマイズ可
- Python/JS双方のAPI設計は将来の機能追加に柔軟に対応

---

## 5. 各ファイルの主なAPI／公開メソッド（一覧）

- **hls-panel.js**  
    - `setCurrT(currT)`：現在時刻をセット
    - `setValidRange(TstartCal, Tlen)`：有効区間（カレンダータイム＋区間長）セット
    - `setOnCurrTChange(fn)`：時刻変更コールバックを外部登録
    - `setOnValidRangeChange(fn)`：有効区間変更コールバックを外部登録
- **systime-panel.js**
    - `setCurrT(currT)`：同期下のパネル群へ現在時刻通知
    - `setValidRange(TstartCal, Tlen)`：同期下パネル群へ有効区間通知
    - `setChildPanels(arr)`：管理下パネルの再登録
    - `setOnCurrTChange(fn)`／`setOnValidRangeChange(fn)`：コールバック再設定
- **mmvserver.py**
    - `/hls_streams`：HLSプレイリスト・JSONリストAPI
    - その他、メディア・JSON静的配信
- **dualhlstest.html**
    - 各パネル生成・コールバック接続

---

## 6. 参考・備考

- 本バージョンは「mmv v1」として保存し、将来の拡張やリファクタのベースとして利用できます
- コード全体・APIはESモジュール化・パネル分離設計で保守性・テスト性重視

---
