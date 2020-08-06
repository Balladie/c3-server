import os

email = input("email: ")
password = input("password: ")

os.system('curl -X POST -d \'{"email":"' + email + '", "password":"' + password + '"}\' -H "Content-Type: application/json" http://c3.iptime.org:1485/api/auth/login/')
