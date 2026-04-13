{
  description = "LLM Chat - Local LLM inference UI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        buildInputs = with pkgs; [
          nodejs_20
          cmake
          ninja
          gcc
          gnumake
          python3
        ];

        libPath = pkgs.lib.makeLibraryPath (with pkgs; [
          stdenv.cc.cc.lib
        ]);

      in
      {
        devShells.default = pkgs.mkShell {
          inherit buildInputs;

          shellHook = ''
            export npm_config_python="${pkgs.python3}/bin/python3"
            export npm_config_cmake="${pkgs.cmake}/bin/cmake"
            export LD_LIBRARY_PATH="${libPath}:$LD_LIBRARY_PATH"
            mkdir -p ~/.llm-chat/models

            # Auto-install npm dependencies if needed
            if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
              echo "Installing npm dependencies..."
              npm ci --prefer-offline 2>/dev/null || npm install
              touch node_modules
            fi

            echo ""
            echo "LLM Chat Dev Shell - Ready!"
            echo ""
            echo "  Run: npm run dev"
            echo "  Open: http://localhost:5173"
            echo ""
          '';

          CMAKE_MAKE_PROGRAM = "${pkgs.gnumake}/bin/make";
          CC = "${pkgs.gcc}/bin/gcc";
          CXX = "${pkgs.gcc}/bin/g++";
        };
      });
}
