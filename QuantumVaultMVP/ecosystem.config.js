module.exports = {
    apps: [
        {
            name: "qv-backend",
            script: "./backend/dist/main.js",
            env: {
                NODE_ENV: "production",
                // Ensure this matches your backend port configuration
                PORT: 13000,
            }
        },
        {
            name: "qv-frontend",
            script: "npm",
            args: "start",
            cwd: "./frontend",
            env: {
                NODE_ENV: "production",
                // Use 13002 to avoid conflict with other apps on port 3000
                PORT: 13002
            }
        },
        {
            name: "dytallix-node",
            script: "./dytallix-fast-launch/node/target/release/dytallix-fast-node",
            args: "",
            env: {
                PORT: 3030
            }
        },
        {
            name: "dytallix-wallet",
            script: "npm",
            args: "run preview -- --port 3000 --host",
            cwd: "./main-frontend",
            env: {
                PORT: 3000,
                NODE_ENV: "production"
            }
        }
    ]
};
