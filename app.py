from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

joined_count = 0  # simple in-memory counter, resets on restart

RIDDLE = "What walks on four legs in the morning, two legs at noon, and three legs in the evening?"
RIDDLE_OPTIONS = ["Man", "Lion", "Centaur", "The Minotaur"]
RIDDLE_ANSWER = "Man"


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
    return render_template("trial.html", riddle=RIDDLE, options=RIDDLE_OPTIONS)


@app.route("/trial/answer", methods=["POST"])
def trial_answer():
    chosen = request.form.get("answer", "")
    if chosen.strip().lower() == RIDDLE_ANSWER.lower():
        return redirect(url_for("olympus"))
    return redirect(url_for("underworld"))


@app.route("/olympus")
def olympus():
    return render_template("olympus.html")


@app.route("/underworld")
def underworld():
    return render_template("underworld.html")


if __name__ == "__main__":
    app.run(debug=True)
