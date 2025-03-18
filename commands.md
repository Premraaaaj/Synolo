# Create Repository
curl -X POST http://localhost:5000/repo/create/test-repo

# Stage Project Folder
curl -X POST http://localhost:5000/stage/test-repo ^
  -H "Content-Type: application/json" ^
  -d "{\"path\": \"C:/Users/VIVEK/Desktop/test-repo-vcs\"}"

# View Staged Files
curl -X GET http://localhost:5000/staged/test-repo

# Commit Changes
curl -X POST http://localhost:5000/commit/test-repo ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"Initial commit\", \"author\": \"Admin\"}"

# View Commit History
curl -X GET http://localhost:5000/history/test-repo

# View Differences
curl -X GET http://localhost:5000/diff/test-repo

# Rollback Repository
curl -X POST http://localhost:5000/rollback/test-repo

# Clone Repository
curl -X POST http://localhost:5000/clone/test-repo ^
  -H "Content-Type: application/json" ^
  -d "{\"target_path\": \"C:/Users/VIVEK/Desktop\"}"

# Delete Repository
curl -X DELETE http://localhost:5000/repo/delete/test-repo
