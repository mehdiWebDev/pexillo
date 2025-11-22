# Gemini CLI for Pexillo Project

This `GEMINI.md` file serves as documentation for using the Gemini CLI within the Pexillo project. The Gemini CLI is an interactive command-line interface agent designed to assist with various software engineering tasks.

## Purpose

The primary purpose of the Gemini CLI in this project is to:

- **Automate tasks:** Perform repetitive or complex coding tasks, such as creating new files, modifying existing code, refactoring, and generating boilerplate.
- **Enforce conventions:** Help maintain consistent coding style, structure, and architectural patterns by adhering to existing project conventions.
- **Aid in development:** Assist developers by providing quick access to information, suggesting code improvements, and streamlining development workflows.
- **Improve code quality:** By integrating with testing and linting tools, the Gemini CLI helps ensure that all changes meet the project's quality standards.

## Capabilities

The Gemini CLI can be used for a wide range of tasks, including but not limited to:

- **File operations:** Create, read, update, and delete files.
- **Code modification:** Apply precise code changes based on instructions, ensuring idiomatic integration.
- **Code analysis:** Understand existing codebases, identify dependencies, and analyze project structure.
- **Testing:** Run tests and help in debugging by identifying potential issues.
- **Dependency management:** Assist with managing project dependencies.
- **Git operations:** Interact with the Git repository for status checks, diffs, and committing changes.

## How to Use

To interact with the Gemini CLI, you will provide natural language commands describing the task you want to accomplish. The CLI will then use its available tools to fulfill your request.

**Key interaction principles:**

- **Be specific:** Provide clear and detailed instructions for the best results.
- **Review changes:** Always review any proposed code changes or file modifications before confirming.
- **Iterative development:** For complex tasks, the CLI can break them down into smaller steps, allowing for iterative progress and feedback.

## Example Workflow

1. **User Request:** "Fix the bug in `src/utils/formatters.js` where the `formatCurrency` function sometimes returns incorrect symbols."
2. **Gemini CLI Action:**
   - Reads the file `src/utils/formatters.js`.
   - Analyzes the `formatCurrency` function.
   - Proposes a code change to correct the currency symbol logic.
   - Asks for user confirmation before applying the change.
   - Runs relevant tests to verify the fix.
3. **User Confirmation/Feedback:** User reviews the change and approves, or provides further instructions.

By leveraging the Gemini CLI, we aim to enhance productivity, maintain code quality, and accelerate development within the Pexillo project.