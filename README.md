Welcome to the Visual Explainer tool!
For this tool to work as intended, you also need the backend python files available at https://github.com/smartchange-eu/trustworthy-ai 
This repository has two ways of being used:


- Docker
  - By using docker in your computer, you can use the command `docker compose up -d` to start the system, and then access it by going to <http://localhost:4200/visualExplainer>
  - This mode can also be used for development if you run `docker compose up -d --build` instead
- Manual
  - You can also run the backend and frontend manually. This is recommended only for advanced users.
  - More info below

The vis_tool folder contains the frontend (vis_tool) code to run the latest counterfactual analysis tool. 

## Running the system in Docker mode

To run in docker mode, first make sure you have docker installed. See <https://docs.docker.com/engine/install/> for more information.

Once you have it installed, go to the root of the repository.
After, run `docker compose up -d`.
Now check the logs if all is correct. It will also contain the url you need to go to to access the tool.

## Developing the system in Docker mode (recommended for beginners)

Start the system with `docker compose up -d --build`. Aterwards, each time you make changes, run `docker compose up -d --build` to force docker to update itself with the latest code. It means that if you change the code, this will pick it up and you will be able to test any changes. It takes some time, but it is the easiest setup. `docker compose up -d` will create a new container each time, `docker compose up -d --build` will update on the same container.

## Installation and Running the code manually

### Setup

1. Install Python (3.11.x)
2. Install Node.js
3. Install pnpm with `npm install --global pnpm`

### Backend

1. create a virtual environtment for the python environment (use venv or conda, just google for how to do it)
2. Install dependencies as listed in Dockerfile
3. Run the app.py. Run the command:  python ./app.py --port 8080

### Frontend

1. go to vis_tool folder (using cd)
2. pnpm i (or pnpm install)
3. pnpm dev
