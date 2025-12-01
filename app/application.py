from flask import Flask, jsonify, request, render_template
import os

from  app.hierarchyAgg import discover_process_tree_from_log, aggregate_process_tree, reset_agg_counters


def create_app():
    app = Flask(__name__)

    os.makedirs("uploads", exist_ok=True)

    @app.route("/")
    def index():
        return render_template("PetriViewer.html")
    
    @app.route("/api/discover", methods=["POST"])
    def discover():
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files["file"]
        file_path = os.path.join("uploads", file.filename)
        file.save(file_path)

        try:
            log_id, model_json, tree_json = discover_process_tree_from_log(file_path)
            model_json["tree"] = tree_json
            return jsonify({"logId":log_id, **model_json})
        except Exception as e:
            return jsonify({"error":str(e)}), 500
        
    return app