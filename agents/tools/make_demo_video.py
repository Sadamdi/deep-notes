"""Draft of the semifinal video: real screenshots of the LOCAL app, English captions, Windows text-to-speech.

Needs the local backend (:4000) and frontend (:5173), Python Playwright, ffmpeg, and the local test accounts in
docs/local/TESTING_ACCOUNTS.local.md. Run from the repo root:

    python agents/tools/make_demo_video.py <output.mp4>

It refuses any app address other than localhost. The result is a draft: a team member should re-record the voice.
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

APP = "http://localhost:5173"
OUT = pathlib.Path(sys.argv[1]).resolve()
WORK = pathlib.Path(tempfile.mkdtemp(prefix="dn-video-"))
accounts = re.findall(r"^(\S+@example\.com) \| (\S+)", pathlib.Path("docs/local/TESTING_ACCOUNTS.local.md").read_text(encoding="utf-8"), re.M)

CARD = """<body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 130px;
background:#f3f9f8;color:#173b4a;font-family:Segoe UI,sans-serif">{}</body>"""


def card(title, lines, eyebrow="Deep Notes"):
    items = "".join(f'<li style="margin:14px 0">{line}</li>' for line in lines)
    return CARD.format(f'<p style="color:#12998c;font-weight:700;font-size:24px;margin:0">{eyebrow}</p>'
                       f'<h1 style="font-size:56px;margin:12px 0 22px">{title}</h1>'
                       f'<ul style="font-size:28px;line-height:1.45;padding-left:30px;margin:0 0 90px">{items}</ul>')


def caption(page, text):
    page.evaluate("""t => { let c = document.getElementById('cap'); if (!c) { c = document.createElement('div'); c.id = 'cap';
      c.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:max-content;max-width:1300px;background:rgba(10,30,40,.92);color:#fff;font:600 25px/1.4 Segoe UI,sans-serif;padding:12px 24px;border-radius:12px;text-align:center;z-index:99999';
      document.body.appendChild(c) } c.textContent = t }""", text)


segments = []


def say(page, *sentences):
    for text in sentences:
        n = len(segments)
        caption(page, text)
        page.screenshot(path=str(WORK / f"{n:02}.png"))
        segments.append(text)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={"width": 1536, "height": 864}, device_scale_factor=1.25)
    page = context.new_page()
    page.set_default_timeout(150_000)

    def api(method, route, body=None, ctx=context):
        res = ctx.request.fetch(f"{APP}/api/v1{route}", method=method, data=json.dumps(body) if body is not None else None,
                                headers={"content-type": "application/json"}, timeout=150_000)
        assert res.ok, f"{method} {route} {res.status} {res.text()[:200]}"
        return res.json()["data"]

    api("POST", "/auth/login", {"email": accounts[0][0], "password": accounts[0][1]})
    title = "Computer Networks - study group"
    found = [n for n in api("GET", "/notebooks") if n["title"] == title]
    if found:
        notebook = found[0]["id"]
    else:
        notebook = api("POST", "/notebooks", {"title": title, "course": "Computer Networks"})["id"]
        text = re.sub(r"=== Halaman \d+ ===", "", pathlib.Path("backend/eval/demo-material.md").read_text(encoding="utf-8")).strip()
        api("POST", f"/notebooks/{notebook}/sources/text", {"title": "Catatan Jaringan Komputer (sintetis)", "text": text})
        token = api("POST", f"/notebooks/{notebook}/invites", {})["token"]
        for email, password in accounts[1:4]:
            other = browser.new_context()
            api("POST", "/auth/login", {"email": email, "password": password}, other)
            api("POST", f"/invites/{token}/accept", None, other)
            other.close()
    source = api("GET", f"/notebooks/{notebook}/sources")[0]["id"]
    base = f"{APP}/workspaces/{notebook}"

    def show(url, wait_for=None, scroll=0):
        page.goto(url)
        page.wait_for_load_state("networkidle")
        if wait_for:
            page.get_by_text(wait_for).first.wait_for()
        page.wait_for_timeout(1500)
        if scroll:
            page.mouse.wheel(0, scroll)
            page.wait_for_timeout(700)

    page.set_content(card("Shared, source-grounded study notebooks", [
        "Team: <b>Aku Nak Menang Hackathon</b>", "Case 1: Smarter Campus and Learning",
        "Sulthan Adam Rahmadi (leader), Maulvi Ilmullah Faturrahman Al Afghani", "Alya Nugrahanti, Ulinnuha Mahbubi"]))
    say(page, "We are Aku Nak Menang Hackathon, and this is Deep Notes, for Case 1: Smarter Campus and Learning.")

    page.set_content(card("The problem", [
        "Study materials are scattered across slides, PDFs, chats and private notes",
        "It is hard to check whether an AI answer matches the course material",
        "Pilot survey, 6 students: all use AI daily and check it against lecture slides",
        "4 of 6 repeat work or lose track of who did what"], "For study groups of 3 to 5 students"))
    say(page, "Students in study groups keep material in many places, and cannot easily verify AI answers.",
        "In our small pilot survey of six students, four repeat work or lose track of who did what.")

    show(base, "Belajar bersama Bubi")
    say(page, "Our solution: one shared notebook per course. A member invites the group and everyone adds sources.")
    page.get_by_label("Tanyakan sesuatu").fill("Apa fungsi switch pada topologi bintang?")
    page.get_by_role("button", name="Tanyakan", exact=True).click()
    page.get_by_text("Bubi menemukan jawabannya").wait_for()
    page.wait_for_timeout(1500)
    page.get_by_text("Bubi menemukan jawabannya").evaluate("e => e.scrollIntoView({block: 'start'})")
    page.wait_for_timeout(700)
    say(page, "Anyone asks a question. Here: what does the switch do in a star topology? The interface is in Indonesian.",
        "The answer uses only the group's sources and shows where it came from. If nothing is found, it says so.")

    show(f"{base}/sources/{source}/map", "Daftar topik")
    say(page, "Each source becomes a concept map that links topics back to their pages.")
    show(f"{base}/class", "Anggota workspace")
    page.get_by_label("Anggota di kelas").wait_for()
    page.mouse.wheel(0, 260)
    page.wait_for_timeout(1500)
    say(page, "In Bubi's classroom, you pick a topic on the board and see how it connects.")
    show(f"{base}/game", "Pilih cara berlatih", 120)
    say(page, "The same sources generate quizzes and games, solo, as a duel, or as a group.")
    show(f"{base}/team", "Kontribusi")
    say(page, "The group board shows contributions, quiz progress, weak topics and tasks.")

    page.set_content(card("Progress today", [
        "<b>Working:</b> accounts, shared notebooks, invites, sources, cited answers",
        "<b>Working:</b> concept map, quizzes, games, group board, social feed",
        "<b>Local to one device:</b> notes, discussion, writing drafts",
        "<b>Not built:</b> publishing, password reset, live presence, audio",
        "<b>Next:</b> measure grounding accuracy, run a student trial, sync notes"], "Honest status"))
    say(page, "Working today: shared notebooks, cited answers, concept maps, quizzes, games, and the group board.",
        "Notes and discussion are still saved on one device. Publishing, password reset and audio are not built.",
        "Next, we will measure answer accuracy, run a trial with students, and sync notes. Thank you.")
    browser.close()

(WORK / "lines.json").write_text(json.dumps(segments), encoding="utf-8")
tts = WORK / "tts.ps1"
tts.write_text("""param($dir)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Zira Desktop'); $s.Rate = 1
$i = 0
foreach ($line in (Get-Content "$dir\\lines.json" -Raw -Encoding utf8 | ConvertFrom-Json)) {
  $s.SetOutputToWaveFile(("$dir\\{0:d2}.wav" -f $i)); $s.Speak($line); $i++ }
$s.Dispose()
""", encoding="utf-8")
subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(tts), str(WORK)], check=True)


def run(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


parts = []
for i in range(len(segments)):
    part = WORK / f"{i:02}.mp4"
    run("-loop", "1", "-framerate", "30", "-i", str(WORK / f"{i:02}.png"), "-i", str(WORK / f"{i:02}.wav"),
        "-af", "apad=pad_dur=0.35,aresample=48000", "-shortest", "-c:v", "libx264", "-tune", "stillimage",
        "-pix_fmt", "yuv420p", "-vf", "scale=1920:1080", "-c:a", "aac", "-ac", "2", str(part))
    parts.append(f"file '{part.as_posix()}'")
(WORK / "parts.txt").write_text("\n".join(parts), encoding="utf-8")
OUT.parent.mkdir(parents=True, exist_ok=True)
run("-f", "concat", "-safe", "0", "-i", str(WORK / "parts.txt"), "-af", "loudnorm=I=-16:TP=-1.5", "-c:v", "copy", "-c:a", "aac", "-ar", "48000", str(OUT))
info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name", "-of", "compact", str(OUT)], capture_output=True, text=True).stdout
print(info, f"frames: {WORK}", sep="\n")
