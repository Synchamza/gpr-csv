"""
FoodPrint Web Backend - Flask API
"""
import os
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import io
import traceback
from calculator import generate_csv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)


@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/process', methods=['POST'])
def process():
    if 'gpr_file' not in request.files:
        return jsonify({'error': 'No GPR file uploaded'}), 400

    gpr_file = request.files['gpr_file']
    if gpr_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    pad_str = request.form.get('pad', '1')
    try:
        pad = int(pad_str)
        if pad < 1 or pad > 16:
            return jsonify({'error': 'Pad number must be 1-16'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid pad number'}), 400

    test_ref = request.form.get('test_ref', '')
    slide_ref = request.form.get('slide_ref', '')
    kit_lot = request.form.get('kit_lot', '')
    slide_lot = request.form.get('slide_lot', '')

    try:
        gpr_content = gpr_file.read().decode('utf-8', errors='replace')
        csv_output = generate_csv(gpr_content, pad, test_ref, slide_ref, kit_lot, slide_lot)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    filename = f"foodprint_pad{pad}"
    if test_ref:
        filename += f"_{test_ref}"
    filename += ".csv"

    return send_file(
        io.BytesIO(csv_output.encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
