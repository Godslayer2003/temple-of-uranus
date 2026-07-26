import random

from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

joined_count = 0  # simple in-memory counter, resets on restart

RIDDLES = [
    {
        "question": "What walks on four legs in the morning, two legs at noon, and three legs in the evening?",
        "options": ["Man", "Lion", "Centaur", "The Minotaur"],
        "answer": "Man",
    },
    {
        "question": "The more you take, the more you leave behind. What am I?",
        "options": ["Footsteps", "Shadows", "Memories", "Time"],
        "answer": "Footsteps",
    },
    {
        "question": "I am not alive, but I grow; I have no lungs, but I need air; I have no mouth, but water kills me. What am I?",
        "options": ["Fire", "A river", "A storm", "A tree"],
        "answer": "Fire",
    },
    {
        "question": "What is so fragile that saying its name breaks it?",
        "options": ["Silence", "Glass", "Trust", "A promise"],
        "answer": "Silence",
    },
    {
        "question": "Two sisters are we: one gives birth to the other, and she in turn gives birth to the first. Who are we?",
        "options": ["Day and Night", "Sun and Moon", "Life and Death", "Fire and Ash"],
        "answer": "Day and Night",
    },
    {
        "question": "The one who makes it sells it. The one who buys it never uses it. The one who uses it never knows it. What is it?",
        "options": ["A coffin", "A gift", "A secret", "A prophecy"],
        "answer": "A coffin",
    },
]

PRESENTERS = [
    {"key": "zeus", "name": "Zeus, Lord of Olympus",
     "intros": [
        "So. A mortal dares approach the throne of the sky.",
        "Few have the courage to stand before me. Prove it was not folly.",
     ]},
    {"key": "poseidon", "name": "Poseidon, Lord of the Sea",
     "intros": [
        "The tides brought you to me, little mortal. Let us see if you sink or swim.",
        "I have drowned sharper minds than yours for lesser insolence. Speak carefully.",
     ]},
    {"key": "athena", "name": "Athena, Goddess of Wisdom",
     "intros": [
        "Wisdom is not given, mortal — it is earned. Show me you deserve it.",
        "I favor those who think before they leap. Consider your answer well.",
     ]},
]

OLYMPUS_MESSAGES = [
    "Wisdom recognizes wisdom. Enter the halls of Olympus, seeker — you have earned your place among the gods.",
    "You have done what few mortals ever do. Olympus opens its gates to you, and the feast awaits.",
    "Sharp of mind, and worthy of glory. Take your seat among us, child of wisdom.",
]

UNDERWORLD_MESSAGES = [
    "Wrong, mortal. Your wisdom failed you. Descend now into the shadow of the Underworld, where all riddles end.",
    "The Fates are unkind to the foolish. Charon awaits your fare at the river's edge.",
    "Even the cleverest tongues fall silent here. Welcome to the realm from which none return.",
]


@app.route("/")
def home():
    thanks = request.args.get("thanks") == "1"
    return render_template("index.html", joined=joined_count, thanks=thanks)


@app.route("/join", methods=["POST"])
def join():
    global joined_count
    joined_count += 1
    return redirect(url_for("home", thanks=1))


@app.route("/trial")
def trial():
    riddle_id = random.randrange(len(RIDDLES))
    riddle = RIDDLES[riddle_id]
    presenter = random.choice(PRESENTERS)
    intro_index = random.randrange(len(presenter["intros"]))
    intro = presenter["intros"][intro_index]
    return render_template(
        "trial.html",
        riddle=riddle["question"],
        options=riddle["options"],
        riddle_id=riddle_id,
        presenter_key=presenter["key"],
        presenter_name=presenter["name"],
        intro=intro,
        intro_index=intro_index,
    )


@app.route("/trial/answer", methods=["POST"])
def trial_answer():
    chosen = request.form.get("answer", "")
    try:
        riddle_id = int(request.form.get("riddle_id", -1))
        correct_answer = RIDDLES[riddle_id]["answer"]
    except (ValueError, IndexError):
        return redirect(url_for("underworld"))
    if chosen.strip().lower() == correct_answer.lower():
        return redirect(url_for("olympus"))
    return redirect(url_for("underworld"))


@app.route("/olympus")
def olympus():
    idx = random.randrange(len(OLYMPUS_MESSAGES))
    return render_template("olympus.html", message=OLYMPUS_MESSAGES[idx], message_index=idx)


@app.route("/underworld")
def underworld():
    idx = random.randrange(len(UNDERWORLD_MESSAGES))
    return render_template("underworld.html", message=UNDERWORLD_MESSAGES[idx], message_index=idx)


if __name__ == "__main__":
    app.run(debug=True)
