; Overlay installs without any setup windows: double-click the download and Overlay opens.
; Updates go through the same path, silently, and reopen Overlay by themselves.
!macro customHeader
  ; Sharp text and artwork on scaled (high-DPI) screens.
  ManifestDPIAware true
!macroend

!macro customInit
  ; No pages, no progress window: install quietly into the user's own folder.
  SetSilent silent
!macroend

!macro customInstall
  ; A first install (not an update, which reopens Overlay itself): start Overlay once it is in place.
  ${ifNot} ${isForceRun}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
  ${endIf}
!macroend
