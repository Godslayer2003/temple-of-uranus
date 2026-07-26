"""
One-off generator: produces the god-voice audio files under static/voices/.

Not run at request time — the site's dialogue is a fixed, enumerable set
(6 riddles x 3 presenters, 6 intro lines, 3 Olympus messages, 3 Underworld
messages), so every line is pre-rendered once here rather than calling a
TTS service on every visitor's page load.

Pipeline: edge-tts (Microsoft's free neural TTS — the same engine behind
Edge's "Read Aloud" and Windows Narrator, no API key required) with a
different named voice per character, plus small pitch/rate adjustments
applied natively by the synthesis engine itself (Hz-based, formant-aware)
rather than post-processed with ffmpeg — the earlier gTTS + ffmpeg
asetrate approach is what produced the chipmunk artifacts.

Requires: pip install edge-tts
"""

import os
import sys
import subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import RIDDLES, PRESENTERS, OLYMPUS_MESSAGES, UNDERWORLD_MESSAGES  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "voices")
os.makedirs(OUT_DIR, exist_ok=True)

# Each god gets a genuinely distinct named Microsoft neural voice (not one
# voice pitch-shifted four ways), with only a small native pitch/rate
# nudge for extra weight.
VOICE_PROFILES = {
    "zeus":     {"voice": "en-US-ChristopherNeural", "pitch": "-20Hz", "rate": "-5%"},
    "poseidon": {"voice": "en-GB-ThomasNeural",       "pitch": "-30Hz", "rate": "-8%"},
    "athena":   {"voice": "en-US-AriaNeural",         "pitch": "+0Hz",  "rate": "+0%"},
    "hades":    {"voice": "en-US-GuyNeural",          "pitch": "-40Hz", "rate": "-10%"},
}


def make(text, voice_key, out_name):
    out_path = os.path.join(OUT_DIR, out_name)
    profile = VOICE_PROFILES[voice_key]
    print("generating:", out_name, "<-", text[:60])
    subprocess.run(
        [
            "edge-tts",
            "--voice", profile["voice"],
            f"--pitch={profile['pitch']}",
            f"--rate={profile['rate']}",
            "--text", text,
            "--write-media", out_path,
        ],
        check=True, capture_output=True,
    )


def main():
    # Riddles: each read by all three presenters
    for rid, riddle in enumerate(RIDDLES):
        for presenter in PRESENTERS:
            make(riddle["question"], presenter["key"], f"riddle_{rid}_{presenter['key']}.mp3")

    # Intro lines: one per presenter per intro index
    for presenter in PRESENTERS:
        for i, line in enumerate(presenter["intros"]):
            make(line, presenter["key"], f"intro_{presenter['key']}_{i}.mp3")

    # Olympus outcome messages (Zeus voice)
    for i, msg in enumerate(OLYMPUS_MESSAGES):
        make(msg, "zeus", f"olympus_{i}.mp3")

    # Underworld outcome messages (Hades voice)
    for i, msg in enumerate(UNDERWORLD_MESSAGES):
        make(msg, "hades", f"underworld_{i}.mp3")

    print("Done.")


if __name__ == "__main__":
    main()
