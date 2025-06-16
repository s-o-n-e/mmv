from flask import Flask, send_from_directory, jsonify
import os
import subprocess
from glob import glob

app = Flask(__name__, static_folder='public', static_url_path='/public')
VIDEO_DIR = './video'
PUBLIC_DIR = './public'
MEDIA_DIR = './media'

@app.route('/')
def list_html_files():
    # ./public ディレクトリから .htmlファイル一覧を取得
    files = [f for f in os.listdir(PUBLIC_DIR) if f.lower().endswith('.html')]
    files.sort()
    # HTMLで一覧を作る
    html = '''
    <!DOCTYPE html>
    <html lang="ja"><head>
      <meta charset="UTF-8"><title>HTMLファイル一覧</title>
      <style>
        body { font-family: sans-serif; margin: 2em;}
        ul { line-height:2; font-size:1.2em;}
        li { margin: 0.3em 0; }
        a { text-decoration: none; color: #036; }
        a:hover { text-decoration: underline; color: #d00;}
      </style>
    </head><body>
    <h2>./public/*.html 一覧</h2>
    <ul>
    '''
    for f in files:
        html += f'<li><a href="/{f}">{f}</a></li>\n'
    html += '''
    </ul>
    </body></html>
    '''
    return html

def get_video_metadata(video_path):
    # ffprobeでJSON出力
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-print_format', 'json',
        '-show_format', '-show_streams',
        video_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        return None
    import json
    info = json.loads(result.stdout)
    format_tags = info.get('format', {}).get('tags', {})
    streams = info.get('streams', [])
    # 一般にvideoストリーム（type='video'）が1つめ
    video_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)

    # メタデータ抽出
    duration = float(info['format'].get('duration', 0))
    creation_time = format_tags.get('creation_time', None)
    frame_rate = None
    if video_stream:
        # 例えば'30/1'の形式のこともあるので分数で評価
        r_frame_rate = video_stream.get('r_frame_rate')
        if r_frame_rate and '/' in r_frame_rate:
            n, d = map(float, r_frame_rate.split('/'))
            frame_rate = n / d if d else None

    return {
        'duration': duration,
        'creation_time': creation_time,
        'frame_rate': frame_rate
    }

@app.route('/videos')
def list_videos():
    files = [f for f in os.listdir(VIDEO_DIR)
             if f.lower().endswith('.mp4') or f.lower().endswith('.mov')]
    video_list = []
    for fname in files:
        fpath = os.path.join(VIDEO_DIR, fname)
        size = os.path.getsize(fpath)
        meta = get_video_metadata(fpath)
        if meta is None:
            continue
        entry = {
            'name': fname,
            'size': size,
            **meta
        }
        video_list.append(entry)
    return jsonify(video_list)

@app.route('/video/<path:filename>')
def get_video(filename):
    return send_from_directory(VIDEO_DIR, filename)

@app.route('/public/<path:filename>')
def serve_public(filename):
    return send_from_directory(PUBLIC_DIR, filename)

@app.route('/hls_streams')
def list_hls_streams():
    """
    media/hls 以下に
      <prefix>_hls/playlist.m3u8 と
      <prefix>_frametime.json
    があれば一覧として返す。
    """
    base = os.path.join(MEDIA_DIR, 'hls')
    streams = []
    for d in os.listdir(base):
        # ディレクトリ名が *_hls ならプレイリスト候補
        if not d.endswith('_hls'):
            continue
        prefix = d[:-4]  # "_hls" を除去
        playlist_path = f'/media/hls/{d}/playlist.m3u8'
        # frametime.json は media/hls/<prefix>_frametime.json
        ft_file = f'{prefix}_frametime.json'
        ft_fullpath = os.path.join(base, ft_file)
        if os.path.isfile(ft_fullpath):
            frametime_path = f'/media/hls/{ft_file}'
        else:
            frametime_path = None
        streams.append({
            'name': prefix,
            'playlist': playlist_path,
            'frametime': frametime_path
        })
    return jsonify(streams)

@app.route('/media/<path:filename>')
def serve_media(filename):
    # /media/... → filesystem の ./media/...
    return send_from_directory(MEDIA_DIR, filename)

if __name__ == "__main__":
    app.run(host='0.0.0.0',debug=True, port=8002)
