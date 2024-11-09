import sys
import gzip

def compress_file(input_file, output_file):
    with open(input_file, 'rb') as f_in:
        with gzip.open(output_file, 'wb') as f_out:
            f_out.writelines(f_in)

def convert_to_c_array(filename, array_name):
    with open(filename, 'rb') as f:
        data = f.read()
    with open(filename + ".cpp", 'w') as f_out:
        f_out.write(f"const uint8_t {array_name}[] PROGMEM = {{\n")
        for i, byte in enumerate(data):
            if i % 12 == 0:
                f_out.write("\n  ")
            f_out.write(f"0x{byte:02x}, ")
        f_out.write("\n};\n")

if __name__ == "__main__":
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python 2gzip.py [-cpp] <filename>")
        sys.exit(1)
    cpp = False
    if len(sys.argv) == 3:
        if sys.argv[1] == "-cpp":
            cpp = True
            input_file = sys.argv[2]
        else:
            print("Usage: python 2gzip.py [-cpp] <filename>")
            sys.exit(1)
    else:
        input_file = sys.argv[1]

    array_name = input_file.replace('.', '_')

    if cpp:
        gz_file = input_file + ".gz"
        compress_file(input_file, gz_file)
        convert_to_c_array(gz_file, array_name + "_gz")
        print(f"Compressed file saved as {gz_file}")
        print(f"C++ file generated as {gz_file}.cpp")
    else:
        gz_file = input_file + ".gz"
        compress_file(input_file, gz_file)
        print(f"Compressed file saved as {gz_file}")