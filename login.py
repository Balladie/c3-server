import os

username = input("username: ")
password = input("password: ")

os.system('curl -X POST -d \'{"username":"' + username + '", "password":"' + password + '"}\' -H "Content-Type: application/json" http://c3.iptime.org:1485/api/auth/login/')
