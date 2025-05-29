# Prompt Builder 🧩
The Modular Prompting Tool - Drag, drop, and assemble reusable prompt components to streamline your workflow!

![Demo Video](Demo.gif)

## Component Prompting Documenation
https://docs.google.com/document/d/1eql1d57SB1DtiW8bkQswjnqmxsSl6Ken-96tjSLdG9k/edit?tab=t.0

## Getting Started (Self-Hosted) 🚀

This version of Prompt Builder runs as a local web application on your computer, using a SQLite database to store your prompts and components.

**Installation Steps:**

1.  **Clone the Repository:**
    Open your terminal or command prompt and run the following command to clone the project files to your local machine:
    ```bash
    git clone https://github.com/your-username/Prompt-Builder.git 
    ```
    (Replace `https://github.com/your-username/Prompt-Builder.git` with the actual repository URL if different.)
    Navigate into the cloned directory:
    ```bash
    cd Prompt-Builder
    ```

2.  **Install Dependencies:**
    Install the necessary project dependencies using npm:
    ```bash
    npm install
    ```

3.  **Initialize the Database:**
    Set up the local SQLite database by running the initialization script:
    ```bash
    npm run db:init
    ```
    This will create a `database.sqlite` file in the `src/db` directory and set up the required tables.

4.  **Run the Application:**
    Start the development server:
    ```bash
    npm run dev
    ```

5.  **Access Prompt Builder:**
    Open your web browser and go to `http://localhost:3000` (or the port indicated in your terminal if 3000 is in use).

You should now see the Prompt Builder application running locally! Your prompts and component library will be saved in the `database.sqlite` file.

## Contribute to Prompt Builder 🤝
We welcome contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up the development environment (Vite/React/TypeScript).

- Submitting pull requests.

- Reporting bugs or suggesting features.

## Feature Ideas 💡
Here are some potential enhancements for the project:
- Automatic formatting
- Built in meta-prompting
- Component prompt variables
- Component nesting
- Upgrade Styles/Design (please...)
- Compiled Prompt Libraries

## Built With 🔧
Frontend: Vite, React, TypeScript, SCSS

Chrome Extension: Manifest V3

## License 📄
This project is licensed under the Apache License 2.0. See LICENSE for details.
