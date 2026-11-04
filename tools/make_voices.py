#!/usr/bin/env python3
"""Records the keepers' lines with ElevenLabs, into assets/voice/.

Run from the Portfolio folder:
    python3 tools/make_voices.py --dry-run    # every line and its cost, no account needed
    python3 tools/make_voices.py              # asks for your API key (hidden), then records

The lines come straight from story.js, so edit them there and run this again: only new or changed
lines are recorded. The key is never saved, and never goes in the website. Only the audio does.
You can also set ELEVENLABS_API_KEY instead of typing it.
"""
import getpass, hashlib, json, os, re, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')
API = 'https://api.elevenlabs.io/v1'
MODELS = ['eleven_v4', 'eleven_v3']  # the first one your account accepts; both understand the [mood] tags below

# Who sounds like whom: voice names from your ElevenLabs account, best first. A voice ID works here too.
CAST = {
    'sage': ['George', 'Bill', 'Brian', 'Daniel'],
    'owl':  ['Alice', 'Lily', 'Matilda', 'Sarah'],
    'fox':  ['Jessica', 'Charlie', 'Laura', 'Sarah'],
    'deer': ['Matilda', 'Sarah', 'River', 'Lily'],
    'wisp': ['Lily', 'Laura', 'River', 'Alice'],
}
# How each mood in story.js is performed
MOODS = {
    'warm': 'warmly', 'grand': 'solemnly', 'sleepy': 'sleepily', 'excited': 'excited', 'stern': 'sternly',
    'sheepish': 'sheepishly', 'gentle': 'softly', 'proud': 'proudly', 'playful': 'playfully', 'hushed': 'whispers',
}
# What the captions say, made easier to say out loud
SAY = [('2005priyanshu@gmail.com', '2 0 0 5 priyanshu, at gmail dot com'), ('FastAPI', 'Fast A P I'), ('XGBoost', 'X G Boost')]


def lines():
    """Every spoken line in story.js, in order: (who, caption, mood)."""
    src = open(os.path.join(ROOT, 'story.js'), encoding='utf-8').read()
    found = []
    a, b = src.index('const SCRIPT = {'), src.index('/* ---------- where the glades go')
    for m in re.finditer(r"who: '(\w+)'[^\n]*?\btext: '([^'\n]*)'(?:, mood: '(\w+)')?", src):
        found.append((m.group(1), m.group(2), m.group(3) or 'warm'))
    host = None
    for row in src[a:b].splitlines():
        h = re.match(r"\s*(owl|fox|deer|wisp): \{", row)
        if h: host = h.group(1)
        for m in re.finditer(r"(?:\['(\w+)', )?\bl\('([^'\n]*)'(?:, '(\w+)')?", row):
            found.append((m.group(1) or host, m.group(2), m.group(3) or 'warm'))
    for name in ('Ledger', 'Ember', 'Fern', 'Lumen'):  # the sage's line when a guide is chosen
        found.append(('sage', f'{name} it is. Go on ahead, {name}.', 'warm'))
    return list(dict.fromkeys(found))


def spoken(text, mood):
    for a, b in SAY:
        text = text.replace(a, b)
    return f'[{MOODS.get(mood, "warmly")}] {text}'


def call(path, key, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=120).read()


def detail(err):
    try:
        return json.loads(err.read()).get('detail', '')
    except Exception:
        return ''


def main():
    all_lines = lines()
    total = sum(len(spoken(t, m)) for _, t, m in all_lines)
    print(f'{len(all_lines)} lines, about {total} characters')
    if '--dry-run' in sys.argv:
        for who, text, mood in all_lines:
            print(f'  {who:5} {mood:9} {text}')
        return
    key = os.environ.get('ELEVENLABS_API_KEY') or getpass.getpass('ElevenLabs API key (hidden as you paste): ').strip()
    try:
        voices = json.loads(call('/voices', key))['voices']
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs refused the key ({e.code}): {detail(e)}\nThe key needs permission to read voices and use text to speech.')
    used, chosen = set(), {}
    for who, prefs in CAST.items():
        match = None
        for p in prefs:
            match = next((v for v in voices if v['voice_id'] not in used and (v['voice_id'] == p or v['name'].split(' ')[0] == p)), None)
            if match: break
        match = match or next((v for v in voices if v['voice_id'] not in used), None)
        if not match:
            sys.exit('Not enough voices in this account.')
        used.add(match['voice_id']); chosen[who] = match
        print(f'  {who:5} -> {match["name"]}')
    os.makedirs(OUT, exist_ok=True)
    manifest, models, done = {}, list(MODELS), 0
    for who, text, mood in all_lines:
        say, voice = spoken(text, mood), chosen[who]['voice_id']
        name = f'{who}-{hashlib.sha1(f"{voice}|{say}".encode()).hexdigest()[:10]}.mp3'
        path = os.path.join(OUT, name)
        while not os.path.exists(path):
            try:
                audio = call(f'/text-to-speech/{voice}?output_format=mp3_44100_128', key,
                             {'text': say, 'model_id': models[0], 'voice_settings': {'stability': .5, 'similarity_boost': .75}})
                open(path, 'wb').write(audio); done += 1
                print(f'  recorded [{models[0]}] {who}: {text[:60]}')
            except urllib.error.HTTPError as e:
                info = detail(e)
                if e.code == 429:
                    time.sleep(5)
                elif e.code in (400, 404, 422) and 'model' in str(info).lower() and len(models) > 1:
                    models.pop(0)
                else:
                    sys.exit(f'Stopped at "{text[:50]}" ({e.code}): {info}\nRun again to carry on: finished lines are kept.')
        manifest[f'{who}|{text}'] = name
        json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    for f in os.listdir(OUT):  # recordings of lines that no longer exist
        if f.endswith('.mp3') and f not in manifest.values():
            os.remove(os.path.join(OUT, f))
    print(f'Done: {done} new recordings, {len(manifest)} lines in total.')


if __name__ == '__main__':
    main()
