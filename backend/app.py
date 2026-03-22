"""
FoodPrint Web Backend - Flask API
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import traceback
from calculator import generate_csv

app = Flask(__name__)
CORS(app)


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
    app.run(debug=True, port=5000)
