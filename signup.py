import os
import pybase64
from urllib import parse

def encode(pw):
    y = pybase64.b64encode(pw.encode('utf-8'))
    y = y[::-1]
    y = parse.quote(y)
    y = parse.quote(y)
    y = parse.quote(y)
    y = pybase64.b64encode(y.encode('utf-8'))
    return y.decode('utf-8')

username = input("username: ")
password = input("password: ")
passwordConfirmation = input("passwordConfirmation: ")
name = input("name: ")
email = input("email: ")

password = encode(password)
passwordConfirmation = encode(passwordConfirmation)

os.system('curl -X POST -d \'{"username":"' + username + '", "password":"' + password + '", "passwordConfirmation":"' + passwordConfirmation + '", "name":"' + name + '", "email":"' + email + '"}\' -H "Content-Type: application/json" http://localhost:1485/api/users/')
