#!/usr/bin/env python3

import argparse
import fcntl
import os
import pty
import select
import signal
import struct
import sys
import termios


def set_window_size(fd: int, rows: int, cols: int) -> None:
    try:
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except OSError:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Bridge stdio to a child process running inside a PTY.")
    parser.add_argument("--cwd", required=True)
    parser.add_argument("--cols", type=int, default=120)
    parser.add_argument("--rows", type=int, default=32)
    parser.add_argument("command")
    parser.add_argument("args", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    command_args = [args.command, *args.args]
    env = os.environ.copy()
    env["TERM"] = env.get("TERM") or "xterm-256color"
    env["COLORTERM"] = env.get("COLORTERM") or "truecolor"
    env["COLUMNS"] = str(max(1, args.cols))
    env["LINES"] = str(max(1, args.rows))

    pid, child_fd = pty.fork()
    if pid == 0:
        os.chdir(args.cwd)
        os.execvpe(args.command, command_args, env)

    set_window_size(child_fd, max(1, args.rows), max(1, args.cols))
    stdin_fd = sys.stdin.fileno()
    stdout_fd = sys.stdout.fileno()

    status = None
    try:
        while True:
            readable, _, _ = select.select([stdin_fd, child_fd], [], [])
            if child_fd in readable:
                try:
                    data = os.read(child_fd, 8192)
                except OSError:
                    break
                if not data:
                    break
                os.write(stdout_fd, data)

            if stdin_fd in readable:
                data = os.read(stdin_fd, 8192)
                if not data:
                    try:
                        os.kill(pid, signal.SIGHUP)
                    except OSError:
                        pass
                    break
                os.write(child_fd, data)
    finally:
        try:
            _, status = os.waitpid(pid, 0)
        except ChildProcessError:
            status = None

    if status is None:
        return 0

    if os.WIFEXITED(status):
        return os.WEXITSTATUS(status)
    if os.WIFSIGNALED(status):
        return 128 + os.WTERMSIG(status)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
