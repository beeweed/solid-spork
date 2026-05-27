from copy import deepcopy


FILE_WRITE_TOOL = {
    'type': 'function',
    'function': {
        'name': 'file_write',
        'description': 'Create or overwrite a file at the given path inside the sandbox. Use for creating new files or fully rewriting existing ones.',
        'parameters': {
            'type': 'object',
            'properties': {
                'file_path': {
                    'type': 'string',
                    'description': 'Absolute path starting with /home/user/. Example: /home/user/project/src/App.tsx',
                },
                'content': {
                    'type': 'string',
                    'description': 'The full content to write to the file.',
                },
            },
            'required': ['file_path', 'content'],
        },
    },
}

FILE_READ_TOOL = {
    'type': 'function',
    'function': {
        'name': 'file_read',
        'description': 'Read the content of an existing file from the sandbox. Returns content with line numbers.',
        'parameters': {
            'type': 'object',
            'properties': {
                'file_path': {
                    'type': 'string',
                    'description': 'Absolute path starting with /home/user/. Example: /home/user/project/src/main.py',
                },
            },
            'required': ['file_path'],
        },
    },
}


class ToolRegistry:
    def __init__(self) -> None:
        self._tools = [FILE_WRITE_TOOL, FILE_READ_TOOL]

    def get_tools(self) -> list[dict]:
        return deepcopy(self._tools)

    def has_tool(self, name: str) -> bool:
        return any(tool['function']['name'] == name for tool in self._tools)
