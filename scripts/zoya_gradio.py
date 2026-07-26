from gradio_client import Client
import base64, json, os, sys, time, shutil

# ─── LOCAL PATCH: Fix Gradio #11722 (bool schema bug) ───
import gradio_client.utils as _gcu, importlib
importlib.reload(_gcu)
_og = _gcu.get_type; _oc = _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og(s)
_gcu._json_schema_to_python_type = lambda s,d=None: "any" if isinstance(s, bool) else _oc(s,d)

MAIN_DIR = r"D:\PICS\GENERATED"
WEBUI_DIR = r"D:\PROJECTS\ZOYA_009\images"

def generate(prompt="", mode="Fast", url="", task="Text2Image", neg_prompt="",
             width=1024, height=1024, seed=-1, image_b64="", mask_b64="",
             lora_path="", lora_weight=0.85):
    os.makedirs(MAIN_DIR, exist_ok=True)
    os.makedirs(WEBUI_DIR, exist_ok=True)

    mode_map = {"Fast":"Fast (8 steps)", "Pro":"Pro (16 steps)", "Expert":"Expert (Base 45 steps)"}
    m = mode_map.get(mode, mode)

    client = Client(url)
    img_data, status_json = client.predict(
        task=task,
        prompt=prompt,
        neg=neg_prompt,
        mode=m,
        w=width,
        h=height,
        seed=seed,
        img64=image_b64,
        mask64=mask_b64,
        lora="Pornmaster v1 (pronmstr)" if lora_path else "None",
        lw=lora_weight,
        cfg=4.5,
        i2i=0.65,
        inp=0.85,
        es=45,
        api_name="/zoya_gateway"
    )

    status = json.loads(status_json)

    if status.get("status") == "ERROR":
        return {"status": "ERROR", "message": status.get("message", "Unknown error")}
    
    # img_data is a local file path string
    if not img_data or not os.path.exists(img_data):
        return {"status": "ERROR", "message": f"Image file not found: {img_data}"}

    ts = int(time.time())
    lora_tag = "lora" if lora_path else "nolf"
    filename = f"Zoya_{mode}_{lora_tag}_{ts}.png"
    
    main_path = os.path.join(MAIN_DIR, filename)
    webui_path = os.path.join(WEBUI_DIR, filename)
    
    shutil.copy2(img_data, main_path)
    shutil.copy2(img_data, webui_path)
    size_kb = round(os.path.getsize(main_path) / 1024, 1)

    return {
        "status": "SUCCESS",
        "file": main_path,
        "filename": filename,
        "size_kb": size_kb,
        "webui_url": f"http://127.0.0.1:25809/api/zoya/images/{filename}",
        "time_seconds": status.get("time", 0),
        "inference_time": status.get("inference", 0),
        "steps": status.get("steps", 0),
        "engine": status.get("engine", ""),
        "lora": status.get("lora", "none")
    }

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"status":"ERROR","message":"Usage: python zoya_gradio.py <prompt> <mode> <url> [lora_path]"}))
        sys.exit(1)
    prompt = sys.argv[1]
    mode = sys.argv[2]
    url = sys.argv[3].rstrip("/")
    lora_path = sys.argv[4] if len(sys.argv) > 4 else ""
    result = generate(prompt=prompt, mode=mode, url=url, lora_path=lora_path)
    print(json.dumps(result))
