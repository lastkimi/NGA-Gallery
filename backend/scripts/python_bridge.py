import sys
import json
import os

# 抑制 Argos 的一些日志
os.environ["ARGOS_DEBUG"] = "0"

try:
    import argostranslate.package
    import argostranslate.translate
except ImportError:
    print(json.dumps({"error": "Failed to import argostranslate"}), flush=True)
    sys.exit(1)

def setup_model():
    from_code = "en"
    to_code = "zh"

    # 检查是否已安装
    installed_languages = argostranslate.translate.get_installed_languages()
    from_lang = list(filter(
        lambda x: x.code == from_code,
        installed_languages))
    to_lang = list(filter(
        lambda x: x.code == to_code,
        installed_languages))

    if from_lang and to_lang:
        return from_lang[0].get_translation(to_lang[0])

    print(json.dumps({"status": "downloading_model"}), flush=True)
    
    # 更新索引
    argostranslate.package.update_package_index()
    
    # 查找可用包
    available_packages = argostranslate.package.get_available_packages()
    package_to_install = next(
        filter(
            lambda x: x.from_code == from_code and x.to_code == to_code,
            available_packages
        ), None
    )
    
    if package_to_install:
        argostranslate.package.install_from_path(package_to_install.download())
        
        # 重新加载
        installed_languages = argostranslate.translate.get_installed_languages()
        from_lang = list(filter(
            lambda x: x.code == from_code,
            installed_languages))
        to_lang = list(filter(
            lambda x: x.code == to_code,
            installed_languages))
            
        if from_lang and to_lang:
            return from_lang[0].get_translation(to_lang[0])
            
    return None

def main():
    try:
        translation = setup_model()
        if not translation:
            print(json.dumps({"error": "Model not found"}), flush=True)
            return

        print(json.dumps({"status": "ready"}), flush=True)

        for line in sys.stdin:
            if not line:
                break
            
            try:
                data = json.loads(line)
                text = data.get("text", "")
                
                if not text:
                    print(json.dumps({"text": ""}), flush=True)
                    continue

                # 翻译
                result = translation.translate(text)
                print(json.dumps({"text": result}), flush=True)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                print(json.dumps({"error": str(e)}), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
