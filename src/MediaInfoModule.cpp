#include <emscripten/bind.h>
#include <MediaInfo/MediaInfo.h>
#include <cstdint>
#include <string>

class MediaInfoJs
{
  MediaInfoLib::MediaInfo mi;

public:
  MediaInfoJs(const MediaInfoLib::String &outputFormat, bool coverData, bool full)
  {
    mi.Option(__T("Output"), outputFormat);
    mi.Option(__T("File_IsSeekable"), __T("1"));
    if (coverData)
    {
      mi.Option(__T("Cover_Data"), __T("base64"));
    }
    if (full)
    {
      mi.Option(__T("Complete"), __T("1"));
    }
  }
  int open(const std::string &data, double fileSize)
  {
    return mi.Open((const ZenLib::int8u *)data.data(), data.size(), NULL, 0, (ZenLib::int64u)fileSize);
  }
  int open_buffer_init(double estimatedFileSize, double fileOffset)
  {
    return mi.Open_Buffer_Init((ZenLib::int64u)estimatedFileSize, (ZenLib::int64u)fileOffset);
  }
  int open_buffer_continue(const std::string &data, double size)
  {
    return mi.Open_Buffer_Continue((ZenLib::int8u *)data.data(), (ZenLib::int64u)size);
  }
  int open_buffer_finalize()
  {
    return mi.Open_Buffer_Finalize();
  }
  int open_buffer_continue_goto_get()
  {
    return open_buffer_continue_goto_get_lower();
  }
  // JS binding doesn't seem to support 64 bit int
  // see https://github.com/buzz/mediainfo.js/issues/11
  int open_buffer_continue_goto_get_lower()
  {
    return mi.Open_Buffer_Continue_GoTo_Get();
  }
  int open_buffer_continue_goto_get_upper()
  {
    return mi.Open_Buffer_Continue_GoTo_Get() >> 32;
  }
  // MediaInfoLib is built in Unicode (wide) mode, so Inform() returns a
  // std::wstring of UTF-32 code points (wchar_t is 4 bytes under emscripten).
  // Encode it to UTF-8 explicitly and return a std::string: embind is built
  // with EMBIND_STD_STRING_IS_UTF8=1, so the UTF-8 bytes reach JS intact. We
  // avoid the char-based (UTF-8) MediaInfoLib build because its 26.05 output
  // mangles non-Latin-1 characters, and we avoid passing std::wstring across
  // the embind boundary (newer emscripten decodes it incorrectly).
  std::string inform()
  {
    const MediaInfoLib::String str = mi.Inform();
    std::string out;
    out.reserve(str.size() * 2);
    for (const auto wc : str)
    {
      const uint32_t c = static_cast<uint32_t>(wc);
      if (c < 0x80)
      {
        out.push_back(static_cast<char>(c));
      }
      else if (c < 0x800)
      {
        out.push_back(static_cast<char>(0xC0 | (c >> 6)));
        out.push_back(static_cast<char>(0x80 | (c & 0x3F)));
      }
      else if (c < 0x10000)
      {
        out.push_back(static_cast<char>(0xE0 | (c >> 12)));
        out.push_back(static_cast<char>(0x80 | ((c >> 6) & 0x3F)));
        out.push_back(static_cast<char>(0x80 | (c & 0x3F)));
      }
      else
      {
        out.push_back(static_cast<char>(0xF0 | (c >> 18)));
        out.push_back(static_cast<char>(0x80 | ((c >> 12) & 0x3F)));
        out.push_back(static_cast<char>(0x80 | ((c >> 6) & 0x3F)));
        out.push_back(static_cast<char>(0x80 | (c & 0x3F)));
      }
    }
    return out;
  }
  void close()
  {
    mi.Close();
  }
};

EMSCRIPTEN_BINDINGS(mediainfojs)
{
  emscripten::class_<MediaInfoJs>("MediaInfo")
      .constructor<const MediaInfoLib::String &, bool, bool>()
      .function("open", &MediaInfoJs::open)
      .function("open_buffer_init", &MediaInfoJs::open_buffer_init)
      .function("open_buffer_continue", &MediaInfoJs::open_buffer_continue)
      .function("open_buffer_continue_goto_get", &MediaInfoJs::open_buffer_continue_goto_get)
      .function("open_buffer_continue_goto_get_lower", &MediaInfoJs::open_buffer_continue_goto_get_lower)
      .function("open_buffer_continue_goto_get_upper", &MediaInfoJs::open_buffer_continue_goto_get_upper)
      .function("open_buffer_finalize", &MediaInfoJs::open_buffer_finalize)
      .function("inform", &MediaInfoJs::inform)
      .function("close", &MediaInfoJs::close);
}
