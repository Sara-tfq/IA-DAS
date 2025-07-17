## Requirements

Docker is the only requirement.

## Install

- Clone the repository
- Run docker compose up --build 




---

## Architecture

In the `services/` folder you will find all the projects that makes your website. Each subfolder is a node.js project
that contains:
- A `package.json` (and potentially some `node_modules`)
- An `index.js` file which is an HTTP server able to received requests
- Some logic used for the service to work correctly


---

At the start of your project, there are 2 services:
- `gateway` which is the clients' entry point. It receives all the requests and then redirect them to the correct service.
- `files` which is used to serve files. It is where your front files will go

---

To create a new service:
- Create a new folder inside `services/`
- Run `npm init -y` inside the created folder
- Create an `index.js` containing an HTTP server (and listening to a new port)
- Add any logic you want

---

To call a service:

2 external packages are allowed to transfer a request:
- `http-proxy` allows you to easily transfer a request "as-is" to another HTTP Server (you have an example in the gateway service)
- `axios` to perform specific REST requests.
