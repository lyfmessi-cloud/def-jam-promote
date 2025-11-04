from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # This fixes "failed to fetch"

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

songs = []

@app.route('/api/songs', methods=['GET'])
def get_songs():
    return jsonify(songs)

@app.route('/api/upload', methods=['POST'])
def upload_song():
    try:
        title = request.form.get('title')
        artist = request.form.get('artist')
        audio_file = request.files.get('audioFile')
        
        if not audio_file or not allowed_file(audio_file.filename):
            return jsonify({'error': 'Invalid audio file'}), 400
        if not title or not artist:
            return jsonify({'error': 'Title and artist required'}), 400
        
        filename = secure_filename(f"{len(songs)+1}-{audio_file.filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        audio_file.save(file_path)
        
        song = {
            'id': len(songs) + 1,
            'title': title,
            'artist': artist,
            'filename': filename,
            'audioUrl': f'http://localhost:5000/uploads/{filename}',
            'likes': 0,
            'rating': 0
        }
        
        songs.append(song)
        return jsonify(song)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def serve_audio(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/songs/<int:song_id>/like', methods=['POST'])
def like_song(song_id):
    song = next((s for s in songs if s['id'] == song_id), None)
    if song:
        song['likes'] += 1
        return jsonify(song)
    return jsonify({'error': 'Song not found'}), 404

@app.route('/api/songs/<int:song_id>/rate', methods=['POST'])
def rate_song(song_id):
    song = next((s for s in songs if s['id'] == song_id), None)
    if song:
        rating = request.json.get('rating')
        if 1 <= rating <= 6:
            song['rating'] = rating
            return jsonify(song)
        return jsonify({'error': 'Invalid rating'}), 400
    return jsonify({'error': 'Song not found'}), 404

@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def delete_song(song_id):
    global songs
    song = next((s for s in songs if s['id'] == song_id), None)
    if song:
        try:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], song['filename'])
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        songs = [s for s in songs if s['id'] != song_id]
        return jsonify({'message': 'Song deleted successfully'})
    return jsonify({'error': 'Song not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)