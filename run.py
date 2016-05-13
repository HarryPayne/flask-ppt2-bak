#!bin/python
from flask_ppt2.__init__ import app
app.secret_key = 'LzJgpubLuH+cDvdMP3H33qos,7b%*3>2K83wiw+qyF83(XRb2Ag69jRpqr%8PGEwR$o]@yyBD7o+h2We'
app.config["MINIFIED"] = False
app.run(debug=True)
