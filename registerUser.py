import os

username = input("username: ")
password = input("password: ")
passwordConfirmation = input("passwordConfirmation: ")
name = input("name: ")
email = input("email: ")

os.system('curl -X POST -d \'{"username":"' + username + '", "password":"' + password + '", "passwordConfirmation":"' + passwordConfirmation + '", "name":"' + name + '", "email":"' + email + '"}\' -H "Content-Type: application/json" http://localhost:1485/api/users/')
