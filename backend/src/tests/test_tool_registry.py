from src.agent.tool_registry import FILE_READ_TOOL, FILE_WRITE_TOOL, ToolRegistry


def test_tool_registry_contains_exact_required_tools():
    registry = ToolRegistry()
    tools = registry.get_tools()
    assert tools == [FILE_WRITE_TOOL, FILE_READ_TOOL]
    assert tools[0]['function']['name'] == 'file_write'
    assert tools[1]['function']['name'] == 'file_read'
