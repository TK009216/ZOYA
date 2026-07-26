import os, sys, base64, json, time, logging, shutil
from io import BytesIO
from pathlib import Path
from PIL import Image

# Patch gradio_client for Issue #11722
import gradio_client.utils as _gcu, importlib
importlib.reload(_gcu)
_og = _gcu.get_type; _oc = _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og(s)
_gcu._json_schema_to_python_type = lambda s,d=None: "any" if isinstance(s, bool) else _oc(s,d)

from gradio_client import Client

class ZoyaGatewayCore:
    def __init__(self, endpoint_url: str, output_dir: str = "./Zoya_Outputs"):
        self.endpoint = endpoint_url
        self.out_dir = Path(output_dir)
        self.out_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(level=logging.INFO, format="%(asctime)s | ZOYA | %(message)s")
        self.logger = logging.getLogger("ZoyaGateway")
        self.logger.info(f"Connecting to {endpoint_url}...")
        self.client = Client(self.endpoint)
        self.logger.info("Connected!")

    def _encode_image(self, image_path: str) -> str:
        if not image_path or not os.path.exists(image_path):
            return ""
        with Image.open(image_path) as img:
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode()

    def execute_task(self, task="Text2Image", prompt="", negative_prompt="",
                     mode="Fast (8 steps)", width=1024, height=1024, seed=-1,
                     image_path="", mask_path="", lora_name="None", lora_weight=0.85,
                     cfg_scale=4.5, i2i_strength=0.65, inp_strength=0.85, expert_steps=45):
        self.logger.info(f"Task: {task} | Mode: {mode}")
        img_b64 = self._encode_image(image_path)
        mask_b64 = self._encode_image(mask_path)
        
        try:
            result = self.client.predict(
                task, prompt, negative_prompt, mode,
                width, height, seed, img_b64, mask_b64,
                lora_name, lora_weight, cfg_scale,
                i2i_strength, inp_strength, expert_steps,
                api_name="/zoya_gateway"
            )
            output_image_tmp, meta_json = result
            
            timestamp = int(time.time())
            final_img_path = self.out_dir / f"Zoya_{task}_{mode.split()[0]}_{timestamp}.png"
            shutil.copy2(output_image_tmp, final_img_path)
            try: os.remove(output_image_tmp)
            except: pass
            
            meta_dict = {}
            meta_path = self.out_dir / f"Zoya_{task}_{mode.split()[0]}_{timestamp}.json"
            try:
                meta_dict = json.loads(meta_json)
                with open(meta_path, "w") as f:
                    json.dump(meta_dict, f, indent=4)
            except: pass
            
            self.logger.info(f"Saved: {final_img_path}")
            return {"status": "success", "file_path": str(final_img_path), "metadata": meta_dict}
        except Exception as e:
            self.logger.error(f"Failed: {e}")
            return {"status": "error", "message": str(e)}

# ─── Run now! ───
URL_FILE = r"D:\PROJECTS\ZOYA_009\images\gradio_url.txt"
if os.path.exists(URL_FILE):
    with open(URL_FILE) as f:
        LIVE_URL = f.read().strip()
else:
    LIVE_URL = "https://f21cdcdfeaeac62e3d.gradio.live"

zoya = ZoyaGatewayCore(endpoint_url=LIVE_URL, output_dir=r"D:\PICS\GENERATED")

print("\n Generating dog image in Fast mode...")
r = zoya.execute_task(
    task="Text2Image",
    prompt="a cute golden retriever dog, sitting on green grass, sunny day, fluffy, realistic, high quality, detailed",
    mode="Fast (8 steps)",
    width=1024, height=1024,
    lora_name="None"
)
print(json.dumps(r, indent=2, default=str))

# Check if image has content
if r["status"] == "success":
    fp = r["file_path"]
    img = Image.open(fp)
    import numpy as np
    arr = np.array(img)
    print(f"\n Image check: {img.size} | Mean: {arr.mean():.1f} | Range: {arr.min()}-{arr.max()}")
    print(f" WebUI: http://127.0.0.1:25809/api/zoya/images/{Path(fp).name}")
