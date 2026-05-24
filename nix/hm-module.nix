# Home-manager module for Dicteren.ai speech-to-text
#
# Provides a systemd user service for autostart.
# Usage: imports = [ dicteren-ai.homeManagerModules.default ];
#        services.dicteren-ai.enable = true;
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.dicteren-ai;
in
{
  options.services.dicteren-ai = {
    enable = lib.mkEnableOption "Dicteren.ai speech-to-text user service";

    package = lib.mkOption {
      type = lib.types.package;
      defaultText = lib.literalExpression "dicteren-ai.packages.\${system}.dicteren-ai";
      description = "The Dicteren.ai package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.user.services.dicteren-ai = {
      Unit = {
        Description = "Dicteren.ai speech-to-text";
        After = [ "graphical-session.target" ];
        PartOf = [ "graphical-session.target" ];
      };
      Service = {
        ExecStart = "${cfg.package}/bin/dicteren-ai";
        Restart = "on-failure";
        RestartSec = 5;
      };
      Install.WantedBy = [ "graphical-session.target" ];
    };
  };
}
