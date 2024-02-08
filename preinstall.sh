SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
NODE_MODULES_DIR=$(realpath "${SCRIPT_DIR}/bun_node_modules")


mkdir -p "${NODE_MODULES_DIR}"
cd "${NODE_MODULES_DIR}"
git clone https://github.com/poolifier/poolifier-bun.git poolifier-bun
cd poolifier-bun
bun install
bun run build:prod