const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	context.subscriptions.push(vscode.commands.registerCommand('banditoth-VSCode-MAUI-ApplePrivacy.createPrivacyManifest', () => {
        createPrivacyManifest(context);
    }));
	context.subscriptions.push(vscode.commands.registerCommand('banditoth-VSCode-MAUI-ApplePrivacy.editPrivacyManifest', () => {
        editPrivacyManifest(context);
    }));
}


function createPrivacyManifest(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    // Discover all .csproj files in the workspace
    vscode.workspace.findFiles('**/*.csproj').then(csprojFiles => {
        if (csprojFiles.length === 0) {
            vscode.window.showErrorMessage('No .csproj files found in the workspace.');
            return;
        }

        let csprojFile;

        if (csprojFiles.length === 1) {
            csprojFile = csprojFiles[0].fsPath;
            createPrivacy(csprojFile);
        } else {
            // If there are multiple .csproj files, let the user choose one
            vscode.window.showQuickPick(
                csprojFiles.map(file => ({
                    label: path.basename(file.fsPath),
                    description: file.fsPath
                })),
                { placeHolder: 'Choose the .csproj file to modify' }
            ).then(chosenFile => {
                if (chosenFile) {
                    csprojFile = chosenFile.description;
                    createPrivacy(csprojFile);
                }
            });
        }
    });
}

function createPrivacy(csprojFile) {
    const iosDirectory = path.join(path.dirname(csprojFile), 'Platforms', 'iOS');
    const privacyInfoFile = path.join(iosDirectory, 'PrivacyInfo.xcprivacy');

    if (fs.existsSync(privacyInfoFile)) {
        vscode.window.showErrorMessage('PrivacyInfo.xcprivacy file is already present. Remove this file to generate the default .NET MAUI privacy manifest.');
        return;
    }

    const csprojContent = fs.readFileSync(csprojFile, 'utf8');
    if (csprojContent.includes('<BundleResource Include="Platforms\\iOS\\PrivacyInfo.xcprivacy" LogicalName="PrivacyInfo.xcprivacy" />')) {
        vscode.window.showErrorMessage('PrivacyInfo.xcprivacy bundle resource already defined in the .csproj file. Remove the BundleResource tag from your .csproj file to generate the default .NET MAUI privacy manifest.');
        return;
    }

    const selectedUserDefaults = vscode.window.showInformationMessage('Are you using "Microsoft.Maui.Storage.Preferences" or "IPreferences"? Applications using Preferences requires additional properties in PrivacyInfo.xcprivacy files', 'Yes (recommended)', 'No');

    selectedUserDefaults.then(value => {
        const userDefaultsReason = value === 'Yes (recommended)' ? true : false;

			// Modify the .csproj file
			const csprojContentWithManifest = csprojContent.replace('</Project>', 
			`
	<ItemGroup Condition="$([MSBuild]::GetTargetPlatformIdentifier('$(TargetFramework)')) == 'ios'">
		<BundleResource Include="Platforms\\iOS\\PrivacyInfo.xcprivacy" LogicalName="PrivacyInfo.xcprivacy" />
	</ItemGroup>
</Project>`);
		fs.writeFileSync(csprojFile, csprojContentWithManifest);

        let privacyInfoContent = 
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>NSPrivacyAccessedAPITypes</key>
<array>
	<dict>
		<key>NSPrivacyAccessedAPIType</key>
		<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
		<key>NSPrivacyAccessedAPITypeReasons</key>
		<array>
			<string>C617.1</string>
		</array>
	</dict>
	<dict>
		<key>NSPrivacyAccessedAPIType</key>
		<string>NSPrivacyAccessedAPICategorySystemBootTime</string>
		<key>NSPrivacyAccessedAPITypeReasons</key>
		<array>
			<string>35F9.1</string>
		</array>
	</dict>
	<dict>
		<key>NSPrivacyAccessedAPIType</key>
		<string>NSPrivacyAccessedAPICategoryDiskSpace</string>
		<key>NSPrivacyAccessedAPITypeReasons</key>
		<array>
			<string>E174.1</string>
		</array>
	</dict>`;

        if (userDefaultsReason) {
            privacyInfoContent += `
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>CA92.1</string>
        </array>
    </dict>`;
        }

        privacyInfoContent += `
	</array>
</dict>
</plist>`;

        fs.writeFileSync(privacyInfoFile, privacyInfoContent);

        vscode.window.showInformationMessage('Default .NET MAUI Apple Privacy manifest file created successfully.');
    });
}


function editPrivacyManifest(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    // Discover all .csproj files in the workspace
    vscode.workspace.findFiles('**/*.csproj').then(csprojFiles => {
        if (csprojFiles.length === 0) {
            vscode.window.showErrorMessage('No .csproj files found in the workspace.');
            return;
        }

        let csprojFile;

        if (csprojFiles.length === 1) {
            csprojFile = csprojFiles[0].fsPath;
            showPrivacyManifest(csprojFile, context);
        } else {
            // If there are multiple .csproj files, let the user choose one
            vscode.window.showQuickPick(
                csprojFiles.map(file => ({
                    label: path.basename(file.fsPath),
                    description: file.fsPath
                })),
                { placeHolder: 'Choose the .csproj file' }
            ).then(chosenFile => {
                if (chosenFile) {
                    csprojFile = chosenFile.description;
                    showPrivacyManifest(csprojFile, context);
                }
            });
        }
    });
}

function showPrivacyManifest(csprojFile, context) {
    const extensionPath = context.extensionPath;
    const iosDirectory = path.join(path.dirname(csprojFile), 'Platforms', 'iOS');
    const privacyInfoFile = path.join(iosDirectory, 'PrivacyInfo.xcprivacy');

    if (!fs.existsSync(privacyInfoFile)) {
        vscode.window.showErrorMessage('PrivacyInfo.xcprivacy file does not exist.');
        return;
    }

    const privacyInfoContent = fs.readFileSync(privacyInfoFile, 'utf8');

    const privacyFormPath = vscode.Uri.file(path.join(extensionPath, 'privacyFormGenerator.html'));
    const privacyFormUri = privacyFormPath.with({ scheme: 'vscode-resource' });

    const panel = vscode.window.createWebviewPanel(
        'editPrivacyManifest',
        'Edit Apple Privacy Manifest',
        vscode.ViewColumn.One,
        {
			enableScripts: true
		}
    );

    panel.webview.html = fs.readFileSync(privacyFormUri.fsPath, 'utf8');

    panel.webview.postMessage({ command: 'loadPrivacyManifest', content: privacyInfoContent });

    panel.webview.onDidReceiveMessage(
        message => {
            if (message.command === 'savePrivacyManifest') 
			{
                fs.writeFileSync(privacyInfoFile, message.content, 'utf8');
                vscode.window.showInformationMessage('Privacy Manifest saved successfully.');
            }
        }
    );
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
