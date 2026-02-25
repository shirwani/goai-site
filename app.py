from flask import Flask, render_template

app = Flask(__name__, static_folder="assets", static_url_path="/assets")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about/")
def about():
    return render_template("about.html")


@app.route("/contact/")
def contact():
    return render_template("contact.html")


@app.route("/faq/")
def faq():
    return render_template("faq.html")


@app.route("/seo/")
def seo():
    return render_template("seo.html")


@app.route("/website-development/")
def website_development():
    return render_template("website_development.html")


@app.route("/mobile-app-development/")
def mobile_app_development():
    return render_template("mobile_app_development.html")


@app.route("/social-media-management/")
def social_media_management():
    return render_template("social_media_management.html")


@app.route("/data-driven-marketing-analytics/")
def data_driven_marketing_analytics():
    return render_template("data_driven_marketing_analytics.html")


@app.route("/reputation-management/")
def reputation_management():
    return render_template("reputation_management.html")


@app.route("/marketing-and-advertising/")
def marketing_and_advertising():
    return render_template("marketing_and_advertising.html")


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True, port=6002)

