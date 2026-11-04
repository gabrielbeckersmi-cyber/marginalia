#!/usr/bin/env python3
"""Uso: python3 gerar_imagens.py lista.json pasta_saida
lista.json: [{"nome":"minerio","prompt":"...","transparente":true,"tamanho":512,
              "motor":"gpt-low","resolucao":"1K","proporcao":"1:1"}, ...]"""
import io, json, os, sys, time, uuid, urllib.request, urllib.error

# >>> COLE SUA CHAVE DO SNAPGEN AQUI <<<
API_KEY = os.environ.get("SNAPGEN_API_KEY") or "COLE_SUA_CHAVE_SNAPGEN_AQUI"

BASES = [os.environ["SNAPGEN_BASE"].rstrip("/")] if os.environ.get("SNAPGEN_BASE") else [
    "https://api.snapgen.ai/uapi/v1", "https://api.geminigen.ai/uapi/v1"]
ENGINE = os.environ.get("SNAPGEN_ENGINE") or "gpt-low"
RES = os.environ.get("SNAPGEN_RES") or "1K"
STYLE = os.environ.get("ESTILO") or "cartoon game asset, thick dark brown outline, vibrant colors, soft shading, clean vector-like look, centered, no text"
UA = "Mozilla/5.0 (compatible; gerar-imagens/1.0)"

ENGINES = {
    "gpt-low":            ("imagen/gpt-image-2", {"mode": "low"}),
    "gpt-medium":         ("imagen/gpt-image-2", {"mode": "medium"}),
    "nano-banana-2-lite": ("generate_image", {"model": "nano-banana-2-lite", "output_format": "png"}),
    "nano-banana-2":      ("generate_image", {"model": "nano-banana-2", "output_format": "png"}),
    "nano-banana-pro":    ("generate_image", {"model": "nano-banana-pro", "output_format": "png"}),
    "grok":               ("imagen/grok", {"mode": "SPEED"}),
}
_base = [None]  # base que funcionou

def multipart(fields):
    b = uuid.uuid4().hex
    out = b""
    for k, v in fields.items():
        out += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    return out + f"--{b}--\r\n".encode(), f"multipart/form-data; boundary={b}"

def http(method, url, body=None, ctype=None, timeout=120):
    h = {"x-api-key": API_KEY, "User-Agent": UA, "Accept": "application/json"}
    if ctype: h["Content-Type"] = ctype
    with urllib.request.urlopen(urllib.request.Request(url, body, h, method=method), timeout=timeout) as r:
        return r.read()

def submit(engine, prompt, res, ratio):
    path, extra = ENGINES[engine]
    fields = {"prompt": prompt, "aspect_ratio": ratio, **extra}
    if engine != "grok": fields["resolution"] = res
    else: fields["orientation"] = {"16:9": "landscape", "4:3": "landscape", "9:16": "portrait", "3:4": "portrait"}.get(ratio, "square")
    body, ct = multipart(fields)
    last = None
    for base in ([_base[0]] if _base[0] else BASES):
        try:
            data = json.loads(http("POST", f"{base}/{path}", body, ct))
            _base[0] = base
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404 and len(BASES) > 1 and not _base[0]:
                last = e; continue
            raise
        except urllib.error.URLError as e:
            last = e; continue
    raise last or RuntimeError("sem resposta da API")

def urls(o, acc=None):
    acc = [] if acc is None else acc
    if isinstance(o, str) and o.startswith("http"): acc.append(o)
    elif isinstance(o, dict):
        for k in ("generate_result", "image_url", "url"):
            if k in o: urls(o[k], acc)
        for k, v in o.items():
            if k not in ("generate_result", "image_url", "url"): urls(v, acc)
    elif isinstance(o, list):
        for v in o: urls(v, acc)
    return acc

def pick(d):
    c = urls(d)
    c = [u for u in c if "thumb" not in u.lower()] or c
    return c[0] if c else None

def wait(data, max_wait=360):
    d = data.get("data", data) if isinstance(data, dict) else data
    uid = d.get("uuid") or d.get("id")
    if d.get("status") == 2 and pick(d): return pick(d)
    if not uid: raise RuntimeError("resposta sem uuid: " + json.dumps(data)[:300])
    t0 = time.time()
    while time.time() - t0 < max_wait:
        time.sleep(4)
        h = json.loads(http("GET", f"{_base[0]}/history/{uid}"))
        h = h.get("data", h)
        if h.get("status") == 2:
            u = pick(h)
            if u: return u
        if h.get("status") == 3:
            raise RuntimeError("falhou: " + str(h.get("error_message") or h.get("error_code") or h)[:200])
    raise RuntimeError("tempo esgotado esperando a imagem")

def chroma(png, size):
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert("RGBA"); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r > 170 and b > 170 and g < 110 and abs(r-b) < 90: px[x, y] = (r, g, b, 0)
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    im.thumbnail((size, size)); return im

def main():
    if API_KEY == "COLE_SUA_CHAVE_SNAPGEN_AQUI": sys.exit("Chave não configurada: cole a chave do SnapGen em API_KEY.")
    lista = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    for it in lista:
        nome, size = it["nome"], it.get("tamanho", 512)
        transp = it.get("transparente", True)
        eng = it.get("motor", ENGINE)
        if eng not in ENGINES: sys.exit(f"motor desconhecido: {eng} ({', '.join(ENGINES)})")
        prompt = f'{it["prompt"]}. {STYLE}.' + (" Isolated on a flat pure magenta (#FF00FF) background." if transp else "")
        for t in range(3):
            try:
                data = submit(eng, prompt, it.get("resolucao", RES), it.get("proporcao", "1:1"))
                png = http("GET", wait(data), timeout=120); break
            except urllib.error.HTTPError as e:
                print(nome, "erro", e.code, e.read()[:200]); time.sleep(15 if e.code == 429 else 5)
            except Exception as e:
                print(nome, "erro", e); time.sleep(5)
        else: continue
        from PIL import Image
        path = os.path.join(out, nome + ".png")
        if transp: chroma(png, size).save(path)
        else:
            im = Image.open(io.BytesIO(png)); im.thumbnail((size, size)); im.save(path)
        print("ok", path)
main()
