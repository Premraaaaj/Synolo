# Simple Version Control System

## Setup

1. Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```

2. Run the application:
    ```sh
    python app.py
    ```

## API Endpoints

### Create Repository

- **URL:** `/create_repo`
- **Method:** `POST`
- **Request Body:**
    ```json
    {
        "name": "repository_name"
    }
    ```
- **Response:**
    - Success: `201 Created`
        ```json
        {
            "message": "Repository created successfully"
        }
        ```
    - Error: `400 Bad Request`
        ```json
        {
            "error": "Repository name is required"
        }
        ```
        or
        ```json
        {
            "error": "Repository already exists"
        }
        ```
