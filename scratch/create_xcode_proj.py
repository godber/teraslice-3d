import os
import uuid

def gen_id():
    return uuid.uuid4().hex[:24].upper()

files = [
    ("AppState.swift", "Sources/App/AppState.swift"),
    ("Teraslice3DApp.swift", "Sources/App/Teraslice3DApp.swift"),
    ("GraphData.swift", "Sources/Models/GraphData.swift"),
    ("JobDetails.swift", "Sources/Models/JobDetails.swift"),
    ("MockGraphProvider.swift", "Sources/Models/MockGraphProvider.swift"),
    ("ServerConfig.swift", "Sources/Models/ServerConfig.swift"),
    ("TerasliceAPIClient.swift", "Sources/Services/TerasliceAPIClient.swift"),
    ("ForceSimulation3D.swift", "Sources/Services/ForceSimulation3D.swift"),
    ("NodeEntity.swift", "Sources/RealityKit/NodeEntity.swift"),
    ("LinkEntity.swift", "Sources/RealityKit/LinkEntity.swift"),
    ("PipelineGraphEntity.swift", "Sources/RealityKit/PipelineGraphEntity.swift"),
    ("ControlOrnamentView.swift", "Sources/Views/ControlOrnamentView.swift"),
    ("JobsInspectorView.swift", "Sources/Views/JobsInspectorView.swift"),
    ("PipelineVolumeView.swift", "Sources/Views/PipelineVolumeView.swift"),
    ("SettingsView.swift", "Sources/Views/SettingsView.swift"),
]

file_refs = {}
build_files = {}

for name, path in files:
    f_id = gen_id()
    b_id = gen_id()
    file_refs[path] = (f_id, name)
    build_files[path] = (b_id, f_id, name)

proj_id = gen_id()
target_id = gen_id()
sources_build_phase_id = gen_id()
frameworks_build_phase_id = gen_id()
resources_build_phase_id = gen_id()
main_group_id = gen_id()
sources_group_id = gen_id()
products_group_id = gen_id()
product_ref_id = gen_id()
target_build_config_list_id = gen_id()
proj_build_config_list_id = gen_id()
target_debug_config_id = gen_id()
target_release_config_id = gen_id()
proj_debug_config_id = gen_id()
proj_release_config_id = gen_id()

file_ref_section = ""
for path, (f_id, name) in file_refs.items():
    file_ref_section += f'        {f_id} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{path}"; sourceTree = "<group>"; }};\n'
file_ref_section += f'        {product_ref_id} /* Teraslice3D.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Teraslice3D.app; sourceTree = BUILT_PRODUCTS_DIR; }};\n'

build_file_section = ""
for path, (b_id, f_id, name) in build_files.items():
    build_file_section += f'        {b_id} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {f_id} /* {name} */; }};\n'

sources_build_files = ""
for path, (b_id, f_id, name) in build_files.items():
    sources_build_files += f'                {b_id} /* {name} in Sources */,\n'

main_group_children = f'                {sources_group_id} /* Sources */,\n                {products_group_id} /* Products */,\n'

sources_group_children = ""
for path, (f_id, name) in file_refs.items():
    sources_group_children += f'                {f_id} /* {name} */,\n'

pbxproj = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 56;
	objects = {{

/* Begin PBXBuildFile section */
{build_file_section}/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{file_ref_section}/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		{frameworks_build_phase_id} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		{main_group_id} = {{
			isa = PBXGroup;
			children = (
{main_group_children}			);
			sourceTree = "<group>";
		}};
		{sources_group_id} /* Sources */ = {{
			isa = PBXGroup;
			children = (
{sources_group_children}			);
			sourceTree = "<group>";
		}};
		{products_group_id} /* Products */ = {{
			isa = PBXGroup;
			children = (
				{product_ref_id} /* Teraslice3D.app */,
			);
			name = Products;
			sourceTree = "<group>";
		}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		{target_id} /* Teraslice3D */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {target_build_config_list_id} /* Build configuration list for PBXNativeTarget "Teraslice3D" */;
			buildPhases = (
				{sources_build_phase_id} /* Sources */,
				{frameworks_build_phase_id} /* Frameworks */,
				{resources_build_phase_id} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = Teraslice3D;
			productName = Teraslice3D;
			productReference = {product_ref_id} /* Teraslice3D.app */;
			productType = "com.apple.product-type.application";
		}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		{proj_id} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1600;
				LastUpgradeCheck = 1600;
				TargetAttributes = {{
					{target_id} = {{
						CreatedOnToolsVersion = 16.0;
					}};
				}};
			}};
			buildConfigurationList = {proj_build_config_list_id} /* Build configuration list for PBXProject "Teraslice3D" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = {main_group_id};
			productRefGroup = {products_group_id} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{target_id} /* Teraslice3D */,
			);
		}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		{resources_build_phase_id} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		{sources_build_phase_id} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{sources_build_files}			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		{proj_debug_config_id} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = xros;
				SUPPORTED_PLATFORMS = "xros xrsimulator";
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				SWIFT_VERSION = 6.0;
				TARGETED_DEVICE_FAMILY = 7;
				XROS_DEPLOYMENT_TARGET = 2.0;
			}};
			name = Debug;
		}};
		{proj_release_config_id} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				MTL_FAST_MATH = YES;
				SDKROOT = xros;
				SUPPORTED_PLATFORMS = "xros xrsimulator";
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				SWIFT_VERSION = 6.0;
				TARGETED_DEVICE_FAMILY = 7;
				XROS_DEPLOYMENT_TARGET = 2.0;
			}};
			name = Release;
		}};
		{target_debug_config_id} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = YES;
				GENERATE_INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				GENERATE_INFOPLIST_KEY_UIApplicationPreferredDefaultSceneSessionRole = UISceneSessionRoleVolumetricApplication;
				GENERATE_INFOPLIST_KEY_UILaunchScreen_Generation = YES;
				GENERATE_INFOPLIST_KEY_NSAppTransportSecurity_NSAllowsArbitraryLoads = YES;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.teraslice.Teraslice3D;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
			}};
			name = Debug;
		}};
		{target_release_config_id} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = YES;
				GENERATE_INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				GENERATE_INFOPLIST_KEY_UIApplicationPreferredDefaultSceneSessionRole = UISceneSessionRoleVolumetricApplication;
				GENERATE_INFOPLIST_KEY_UILaunchScreen_Generation = YES;
				GENERATE_INFOPLIST_KEY_NSAppTransportSecurity_NSAllowsArbitraryLoads = YES;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.teraslice.Teraslice3D;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
			}};
			name = Release;
		}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		{proj_build_config_list_id} /* Build configuration list for PBXProject "Teraslice3D" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{proj_debug_config_id} /* Debug */,
				{proj_release_config_id} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{target_build_config_list_id} /* Build configuration list for PBXNativeTarget "Teraslice3D" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{target_debug_config_id} /* Debug */,
				{target_release_config_id} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
/* End XCConfigurationList section */
	}};
	rootObject = {proj_id} /* Project object */;
}}
"""

os.makedirs("Teraslice3D-visionOS/Teraslice3D.xcodeproj", exist_ok=True)
with open("Teraslice3D-visionOS/Teraslice3D.xcodeproj/project.pbxproj", "w") as f:
    f.write(pbxproj)

print("Created Teraslice3D.xcodeproj successfully")
