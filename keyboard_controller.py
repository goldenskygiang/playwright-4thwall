#!/usr/bin/env python3
"""
Minimal Flask server for cross-platform keyboard control via HTTP requests.
Install dependencies: pip install flask pynput
"""

from flask import Flask, request, jsonify
import threading
import sys
import os
import signal
from pynput.keyboard import Key, Controller
import time

app = Flask(__name__)
keyboard = Controller()

# Key mapping for special keys
KEY_MAP = {
    'ctrl': Key.ctrl_l,
    'alt': Key.alt_l,
    'shift': Key.shift_l,
    'cmd': Key.cmd if sys.platform == 'darwin' else Key.ctrl_l,
    'super': Key.cmd if sys.platform == 'darwin' else Key.ctrl_l,
    'tab': Key.tab,
    'enter': Key.enter,
    'space': Key.space,
    'backspace': Key.backspace,
    'delete': Key.delete,
    'esc': Key.esc,
    'escape': Key.esc,
    'up': Key.up,
    'down': Key.down,
    'left': Key.left,
    'right': Key.right,
    'home': Key.home,
    'end': Key.end,
    'page_up': Key.page_up,
    'page_down': Key.page_down,
    'f1': Key.f1, 'f2': Key.f2, 'f3': Key.f3, 'f4': Key.f4,
    'f5': Key.f5, 'f6': Key.f6, 'f7': Key.f7, 'f8': Key.f8,
    'f9': Key.f9, 'f10': Key.f10, 'f11': Key.f11, 'f12': Key.f12,
}

def get_key(key_name):
    """Convert key name to pynput Key object or character."""
    key_lower = key_name.lower()
    if key_lower in KEY_MAP:
        return KEY_MAP[key_lower]
    return key_name

@app.route('/key/press', methods=['POST'])
def key_press():
    """Press and release a key."""
    try:
        data = request.get_json()
        key_name = data.get('key')
        if not key_name:
            return jsonify({'error': 'key parameter required'}), 400
        
        key = get_key(key_name)
        keyboard.press(key)
        keyboard.release(key)
        
        return jsonify({'status': 'success', 'action': 'press', 'key': key_name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/key/down', methods=['POST'])
def key_down():
    """Press and hold a key."""
    try:
        data = request.get_json()
        key_name = data.get('key')
        if not key_name:
            return jsonify({'error': 'key parameter required'}), 400
        
        key = get_key(key_name)
        keyboard.press(key)
        
        return jsonify({'status': 'success', 'action': 'down', 'key': key_name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/key/up', methods=['POST'])
def key_up():
    """Release a key."""
    try:
        data = request.get_json()
        key_name = data.get('key')
        if not key_name:
            return jsonify({'error': 'key parameter required'}), 400
        
        key = get_key(key_name)
        keyboard.release(key)
        
        return jsonify({'status': 'success', 'action': 'up', 'key': key_name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/key/combo', methods=['POST'])
def key_combo():
    """Press a combination of keys (e.g., Ctrl+C)."""
    try:
        data = request.get_json()
        keys = data.get('keys', [])
        if not keys or not isinstance(keys, list):
            return jsonify({'error': 'keys array parameter required'}), 400
        
        # Convert key names to key objects
        key_objects = [get_key(key) for key in keys]
        
        # Press all keys
        for key in key_objects:
            keyboard.press(key)
        
        # Small delay for combo recognition
        time.sleep(0.01)
        
        # Release all keys in reverse order
        for key in reversed(key_objects):
            keyboard.release(key)
        
        return jsonify({'status': 'success', 'action': 'combo', 'keys': keys})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/type', methods=['POST'])
def type_text():
    """Type a string of text."""
    try:
        data = request.get_json()
        text = data.get('text')
        if text is None:
            return jsonify({'error': 'text parameter required'}), 400
        
        keyboard.type(text)
        
        return jsonify({'status': 'success', 'action': 'type', 'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/shutdown', methods=['POST'])
def shutdown_server():
    """Shutdown the Flask server."""
    try:
        # Schedule shutdown after response is sent
        def shutdown():
            time.sleep(0.1)
            os.kill(os.getpid(), signal.SIGTERM)
        
        threading.Thread(target=shutdown).start()
        return jsonify({'status': 'success', 'message': 'Server shutting down...'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def info():
    """Show API information."""
    return jsonify({
        'name': 'Keyboard Controller API',
        'version': '1.0.0',
        'endpoints': {
            'POST /key/press': 'Press and release a key (body: {"key": "a"})',
            'POST /key/down': 'Press and hold a key (body: {"key": "shift"})',
            'POST /key/up': 'Release a key (body: {"key": "shift"})',
            'POST /key/combo': 'Press key combination (body: {"keys": ["ctrl", "c"]})',
            'POST /type': 'Type text string (body: {"text": "Hello World"})',
            'POST /shutdown': 'Shutdown server',
        },
        'platform': sys.platform
    })

if __name__ == '__main__':
    print("Starting Keyboard Controller Server...")
    print("Install dependencies: pip install flask pynput")
    print("Server will run on http://localhost:5001")
    print("\nExample usage:")
    print("curl -X POST -H 'Content-Type: application/json' -d '{\"key\":\"a\"}' http://localhost:5001/key/press")
    print("curl -X POST -H 'Content-Type: application/json' -d '{\"keys\":[\"ctrl\",\"c\"]}' http://localhost:5001/key/combo")
    print("curl -X POST -H 'Content-Type: application/json' -d '{\"text\":\"Hello World\"}' http://localhost:5001/type")
    
    app.run(host='0.0.0.0', port=5001, debug=False)